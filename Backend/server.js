import cors from "cors";
import { spawn } from "child_process";
import dotenv from "dotenv";
import express from "express";
import fs from "fs";
import helmet from "helmet";
import net from "net";
import path from "path";
import { fileURLToPath } from "url";

// Internal modules
import { getConfig, validateEnv } from "./lib/config.js";
import logger from "./lib/logger.js";
import { connectMongo } from "./lib/mongo.js";
import setupGracefulShutdown from "./lib/gracefulShutdown.js";

// Middleware
import errorHandler from "./middleware/errorHandler.js";
import requestLogger from "./middleware/requestLogger.js";
import { createSecurityHeaders } from "./middleware/security.js";
import { generalLimiter } from "./middleware/rateLimiter.js";
import { requestId } from "./middleware/requestId.js";

// Routes
import apiRoutes from "./routes/index.js";
import User from "./models/User.js";

// Load environment variables
dotenv.config();

const config = getConfig();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// Trust proxy if configured (for correct IP behind load balancers/reverse proxies)
if (config.trustProxy) {
  app.set("trust proxy", true);
}

// ============================================================================
// SECURITY MIDDLEWARE
// ============================================================================

// Helmet for comprehensive security headers
app.use(
  helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"]
      }
    },
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" }
  })
);

// Custom security headers
app.use(createSecurityHeaders());

// CORS configuration
app.use(
  cors({
    origin(origin, callback) {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) {
        callback(null, true);
        return;
      }

      if (config.nodeEnv === "development") {
        try {
          const { hostname } = new URL(origin);
          if (["localhost", "127.0.0.1"].includes(hostname)) {
            callback(null, true);
            return;
          }
        } catch {
          // Fall through to the configured allow-list.
        }
      }

      if (config.allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }

      logger.warn("CORS blocked origin", { origin });
      callback(new Error(`CORS blocked origin: ${origin}`));
    },
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization", "X-Request-ID"],
    exposedHeaders: ["X-Request-ID", "X-RateLimit-Limit", "X-RateLimit-Remaining", "X-RateLimit-Reset"],
    maxAge: 86400 // 24 hours
  })
);

// ============================================================================
// REQUEST PARSING MIDDLEWARE
// ============================================================================

// Body size limits to prevent DoS
app.use(express.json({ limit: config.maxJsonBody }));
app.use(express.urlencoded({ extended: true, limit: config.maxJsonBody }));

// Custom NoSQL injection prevention (compatible with Express 5 getter-only query)
app.use((req, res, next) => {
  function sanitizeValue(value) {
    if (value === null || value === undefined) return value;
    if (typeof value === "object") {
      if (Array.isArray(value)) return value.map(sanitizeValue);
      const sanitized = {};
      for (const [k, v] of Object.entries(value)) {
        if (k.startsWith("$")) continue; // Remove $ operators (e.g. $ne, $gt)
        sanitized[k] = sanitizeValue(v);
      }
      return sanitized;
    }
    return value;
  }

  // Sanitize body (writable object)
  if (req.body && typeof req.body === "object") {
    req.body = sanitizeValue(req.body);
  }
  next();
});

// ============================================================================
// OBSERVABILITY MIDDLEWARE
// ============================================================================

// Request ID for tracing
app.use(requestId);

// Request logging
app.use(requestLogger);

// ============================================================================
// RATE LIMITING
// ============================================================================

// General rate limit for all API requests
app.use("/api", generalLimiter);

// ============================================================================
// STATIC FILES
// ============================================================================

app.use("/uploads", express.static("uploads", {
  dotfiles: "deny",
  headers: {
    "X-Content-Type-Options": "nosniff",
    "Cache-Control": "public, max-age=86400"
  }
}));

// ============================================================================
// HEALTH CHECK
// ============================================================================

app.get("/api/health", async (req, res) => {
  const mongoose = (await import("mongoose")).default;
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbState = dbStates[mongoose.connection.readyState] || "unknown";
  let dbPingMs = null;

  if (mongoose.connection.readyState === 1) {
    try {
      const pingStart = Date.now();
      await mongoose.connection.db.admin().ping();
      dbPingMs = Date.now() - pingStart;
    } catch {
      dbPingMs = -1;
    }
  }

  const databaseHealthy = dbState === "connected" && dbPingMs !== -1;
  
  const health = {
    status: databaseHealthy ? "healthy" : "degraded",
    api: "ok",
    database: dbState,
    dbName: mongoose.connection.name || null,
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: process.env.npm_package_version || "0.1.0",
    services: {
      api: "ok",
      database: dbState,
      dbName: mongoose.connection.name || null,
      dbPingMs
    },
    checks: {
      api: true,
      database: databaseHealthy
    },
    memory: {
      rss: Math.round(process.memoryUsage().rss / 1024 / 1024),
      heapUsed: Math.round(process.memoryUsage().heapUsed / 1024 / 1024),
      heapTotal: Math.round(process.memoryUsage().heapTotal / 1024 / 1024)
    }
  };

  const statusCode = health.status === "healthy" ? 200 : 503;
  res.status(statusCode).json(health);
});

// Readiness probe for Kubernetes/load balancers
app.get("/api/ready", async (req, res) => {
  const mongoose = (await import("mongoose")).default;
  if (mongoose.connection.readyState === 1) {
    res.json({ ready: true });
  } else {
    res.status(503).json({ ready: false, reason: "Database not connected" });
  }
});

// ============================================================================
// API ROUTES
// ============================================================================

app.use("/api", apiRoutes);

// Root endpoint
app.get("/", (req, res) => {
  res.json({ 
    message: "ATI Jaffna API is running",
    version: process.env.npm_package_version || "0.1.0",
    docs: "/api/health"
  });
});

// 404 handler for unknown routes
app.use((req, res) => {
  res.status(404).json({ 
    message: "Route not found",
    code: "NOT_FOUND",
    path: req.originalUrl
  });
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

app.use(errorHandler);

// ============================================================================
// MONGODB LOCAL AUTO-START (Development only)
// ============================================================================

const isLocalMongoUri = (uri) => {
  try {
    const parsed = new URL(uri);
    return ["127.0.0.1", "localhost"].includes(parsed.hostname);
  } catch {
    return false;
  }
};

const mongoPortFromUri = (uri) => {
  try {
    return Number(new URL(uri).port || 27017);
  } catch {
    return 27017;
  }
};

const waitForPort = (targetPort, retries = 20) =>
  new Promise((resolve, reject) => {
    let attempts = 0;

    const check = () => {
      const socket = net.createConnection({ host: "127.0.0.1", port: targetPort });

      socket.once("connect", () => {
        socket.destroy();
        resolve();
      });

      socket.once("error", () => {
        socket.destroy();
        attempts += 1;
        if (attempts >= retries) {
          reject(new Error(`MongoDB did not start on port ${targetPort}.`));
          return;
        }

        setTimeout(check, 500);
      });
    };

    check();
  });

const ensureLocalMongo = async () => {
  if (!isLocalMongoUri(config.mongoUri) || !config.autoStartMongo) return;

  const mongoPort = mongoPortFromUri(config.mongoUri);
  try {
    await waitForPort(mongoPort, 1);
    return;
  } catch {
    const dataPath = config.mongoDataPath || path.resolve(__dirname, "../.mongodb-data");
    const logPath = config.mongoLogPath || path.resolve(__dirname, "../.mongodb-log/mongod.log");

    fs.mkdirSync(dataPath, { recursive: true });
    fs.mkdirSync(path.dirname(logPath), { recursive: true });

    logger.info("Starting local MongoDB", { port: mongoPort });
    const mongod = spawn("mongod", ["--dbpath", dataPath, "--logpath", logPath, "--port", String(mongoPort)], {
      detached: true,
      stdio: "ignore",
      windowsHide: true
    });

    mongod.on("error", (error) => {
      logger.error("Unable to start mongod", { error: error.message });
    });

    mongod.unref();
    await waitForPort(mongoPort);
  }
};

// ============================================================================
// DEFAULT ADMIN SEEDING
// ============================================================================

const ensureDefaultAdmin = async () => {
  if (!config.seedDefaultAdmin) return;

  logger.info("Checking default admin account");

  const email = String(config.defaultAdminEmail || "").trim().toLowerCase();
  const password = config.defaultAdminPassword;
  const bcrypt = await import("bcryptjs");
  const passwordHash = await bcrypt.default.hash(password, config.bcryptRounds);
  const existingDefaultAdmin = await User.findOne({ email });

  if (existingDefaultAdmin) {
    existingDefaultAdmin.name = existingDefaultAdmin.name || config.defaultAdminName;
    existingDefaultAdmin.role = "admin";
    existingDefaultAdmin.accountStatus = "approved";

    if (config.nodeEnv !== "production") {
      existingDefaultAdmin.passwordHash = passwordHash;
      existingDefaultAdmin.mustChangePassword = false;
    }

    await existingDefaultAdmin.save();
    logger.info("Default admin account ready", { email });

    if (config.nodeEnv === "production" && password === "123456") {
      logger.warn("Default admin password is being used. Change it immediately!");
    }
    return;
  }

  const existingAdmin = await User.exists({ role: "admin" });
  if (existingAdmin && config.nodeEnv === "production") {
    return;
  }

  await User.create({
    name: config.defaultAdminName,
    email,
    passwordHash,
    role: "admin",
    accountStatus: "approved",
    adminProfile: {
      designation: "Administrator"
    }
  });

  logger.info("Created default admin account", { email });

  if (config.nodeEnv === "production" && password === "123456") {
    logger.warn("Default admin password is being used. Change it immediately!");
  }
};

// ============================================================================
// SERVER STARTUP
// ============================================================================

function mongoDbNameFromUri(uri) {
  try {
    return new URL(uri).pathname.replace(/^\//, "") || "test";
  } catch {
    return "unknown";
  }
}

function classifyStartupError(error) {
  if (error?.name === "MongooseServerSelectionError") return "MongoDB connection error";
  if (error?.name === "ValidationError") return "Mongoose schema validation error";
  if (error?.code === 11000) return "MongoDB duplicate key error";
  if (error?.code === "EADDRINUSE") return "HTTP port conflict";
  if (/missing required env vars|JWT_SECRET|MONGO_URI|MONGODB_URI|PORT/i.test(error?.message || "")) {
    return "Environment variable misconfiguration";
  }
  if (error instanceof TypeError || error instanceof ReferenceError) return "Undefined variable / null reference error";
  return "Async startup failure";
}

function installProcessSafetyHandlers() {
  process.on("uncaughtException", (error) => {
    logger.error("Uncaught exception before graceful shutdown", {
      category: classifyStartupError(error),
      error: error.message,
      stack: error.stack
    });
    process.exit(1);
  });

  process.on("unhandledRejection", (reason) => {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    logger.error("Unhandled promise rejection", {
      category: classifyStartupError(error),
      error: error.message,
      stack: error.stack
    });
  });
}

async function startServer() {
  let server = null;
  try {
    validateEnv();

    logger.info("Starting ATI Jaffna API", {
      port: config.port,
      db: mongoDbNameFromUri(config.mongoUri),
      mongoUri: config.mongoUri.replace(/\/\/([^:@]+):([^@]+)@/, "//***:***@")
    });

    await ensureLocalMongo();
    
    // Use the improved connectMongo from lib/mongo.js
    await connectMongo(config.mongoUri);
    
    await ensureDefaultAdmin();

    server = await new Promise((resolve, reject) => {
      const instance = app.listen(config.port, () => {
        logger.info("ATI Jaffna API started", {
          port: config.port,
          env: config.nodeEnv,
          db: mongoDbNameFromUri(config.mongoUri),
          url: `http://localhost:${config.port}`
        });
        resolve(instance);
      });

      instance.once("error", reject);
    });

    server.on("error", (error) => {
      logger.error("HTTP server error", {
        category: classifyStartupError(error),
        error: error.message,
        code: error.code,
        port: config.port
      });
    });

    // Setup graceful shutdown with the server instance
    setupGracefulShutdown(server);

    return server;
  } catch (error) {
    logger.error("Server startup failed", {
      category: classifyStartupError(error),
      error: error.message,
      stack: error.stack,
      db: mongoDbNameFromUri(config.mongoUri),
      port: config.port
    });
    if (error.name === "MongooseServerSelectionError") {
      logger.error("Install/start MongoDB, or set MONGODB_URI to a reachable MongoDB connection string.");
    }
    if (error.code === "EADDRINUSE") {
      logger.error("Server port is already in use", {
        port: config.port,
        fix: `Close the process using port ${config.port}, or set PORT to another value.`
      });
    }
    if (server) {
      await new Promise((resolve) => server.close(resolve)).catch(() => {});
    }
    process.exit(1);
  }
}

installProcessSafetyHandlers();
startServer();
