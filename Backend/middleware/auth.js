import jwt from "jsonwebtoken";
import { getConfig } from "../lib/config.js";
import logger from "../lib/logger.js";

function getSecret() {
  // Read config lazily at call time (not at import time) to ensure dotenv has loaded
  return getConfig().jwtSecret;
}

export function requireAuth(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) return res.status(401).json({ message: "Authentication required" });

  try {
    req.user = jwt.verify(token, getSecret());
    next();
  } catch (err) {
    if (err.name === "TokenExpiredError") {
      return res.status(401).json({ message: "Token expired", expiredAt: err.expiredAt });
    }
    logger.warn("Invalid token attempt", { ip: req.ip, error: err.message });
    res.status(401).json({ message: "Invalid token" });
  }
}

export function requireAdmin(req, res, next) {
  if (req.user?.role !== "admin") return res.status(403).json({ message: "Admin access required" });
  next();
}

export function requireRole(...roles) {
  return (req, res, next) => {
    if (!roles.includes(req.user?.role)) {
      return res.status(403).json({ message: `Access requires one of these roles: ${roles.join(", ")}` });
    }
    next();
  };
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (token) {
    try {
      req.user = jwt.verify(token, getSecret());
    } catch {
      req.user = null;
    }
  }
  next();
}