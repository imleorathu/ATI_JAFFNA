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

// Validate environment before starting
validateEnv();

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
  
  const health = {
    status: dbState === "connected" ? "healthy" : "degraded",
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    environment: config.nodeEnv,
    version: process.env.npm_package_version || "0.1.0",
    services: {
      api: "ok",
      database: dbState,
      dbName: mongoose.connection.name || null
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

  const existingAdmin = await User.exists({ role: "admin" });
  if (existingAdmin) return;

  const email = config.defaultAdminEmail;
  const password = config.defaultAdminPassword;
  const bcrypt = await import("bcryptjs");

  await User.create({
    name: config.defaultAdminName,
    email,
    passwordHash: await bcrypt.default.hash(password, config.bcryptRounds),
    role: "admin",
    accountStatus: "approved"
  });

  logger.info("Created default admin account", { email });
  
  if (config.nodeEnv === "production" && password === "Admin@12345") {
    logger.warn("Default admin password is being used. Change it immediately!");
  }
};

// ============================================================================
// SERVER STARTUP
// ============================================================================

async function startServer() {
  try {
    await ensureLocalMongo();
    
    // Use the improved connectMongo from lib/mongo.js
    await connectMongo(config.mongoUri);
    
    await ensureDefaultAdmin();

    const server = app.listen(config.port, () => {
      logger.info("ATI Jaffna API started", {
        port: config.port,
        env: config.nodeEnv,
        url: `http://localhost:${config.port}`
      });
    });

    // Setup graceful shutdown with the server instance
    setupGracefulShutdown(server);

    return server;
  } catch (error) {
    logger.error("Server startup failed", { 
      error: error.message,
      stack: error.stack 
    });
    logger.error("Install/start MongoDB, or set MONGODB_URI to a reachable MongoDB connection string.");
    process.exit(1);
  }
}

startServer();