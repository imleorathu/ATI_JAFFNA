import { Router } from "express";
import mongoose from "mongoose";
import logger from "../lib/logger.js";

const router = Router();
const startTime = Date.now();

router.get("/health", (req, res) => {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbStateLabels = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };

  res.json({
    status: "ok",
    version: process.env.npm_package_version || "0.1.0",
    environment: process.env.NODE_ENV || "development",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    database: {
      state: dbStateLabels[mongoose.connection.readyState] || "unknown",
      name: mongoose.connection.name || null
    }
  });
});

router.get("/health/detailed", async (req, res) => {
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];
  const dbStateLabels = {
    0: "disconnected",
    1: "connected",
    2: "connecting",
    3: "disconnecting"
  };

  const dbInfo = {
    state: dbStateLabels[mongoose.connection.readyState] || "unknown",
    name: mongoose.connection.name || null,
    host: mongoose.connection.host || null,
    port: mongoose.connection.port || null
  };

  let dbPing = null;
  try {
    const start = Date.now();
    await mongoose.connection.db.admin().ping();
    dbPing = Date.now() - start;
  } catch {
    dbPing = -1;
  }

  const memory = process.memoryUsage();
  const checks = {
    database: mongoose.connection.readyState === 1 && dbPing !== -1,
    memory: memory.rss < 2 * 1024 * 1024 * 1024 // 2GB limit
  };

  const overallHealthy = Object.values(checks).every(Boolean);

  res.json({
    status: overallHealthy ? "healthy" : "degraded",
    version: process.env.npm_package_version || "0.1.0",
    environment: process.env.NODE_ENV || "development",
    uptime: Math.floor((Date.now() - startTime) / 1000),
    timestamp: new Date().toISOString(),
    checks,
    database: { ...dbInfo, pingMs: dbPing },
    memory: {
      rssMb: Math.round(memory.rss / 1024 / 1024),
      heapUsedMb: Math.round(memory.heapUsed / 1024 / 1024),
      heapTotalMb: Math.round(memory.heapTotal / 1024 / 1024)
    }
  });
});

router.get("/ready", (req, res) => {
  const isReady = mongoose.connection.readyState === 1;
  if (isReady) {
    res.json({ status: "ready" });
  } else {
    res.status(503).json({ status: "not ready", database: dbStates[mongoose.connection.readyState] });
  }
});

router.get("/metrics", async (req, res) => {
  const memory = process.memoryUsage();
  const dbStates = ["disconnected", "connected", "connecting", "disconnecting"];

  const metrics = {
    uptime_seconds: Math.floor((Date.now() - startTime) / 1000),
    node_version: process.version,
    memory_rss_bytes: memory.rss,
    memory_heap_used_bytes: memory.heapUsed,
    memory_heap_total_bytes: memory.heapTotal,
    memory_external_bytes: memory.external,
    db_state: dbStates[mongoose.connection.readyState] || "unknown",
    db_connected: mongoose.connection.readyState === 1 ? 1 : 0
  };

  const lines = Object.entries(metrics).map(([key, value]) => `${key} ${value}`);
  res.set("Content-Type", "text/plain");
  res.send(lines.join("\n") + "\n");
});

export default router;
