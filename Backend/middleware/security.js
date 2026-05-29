import logger from "../lib/logger.js";

function sanitizeInput(value) {
  if (typeof value !== "string") return value;
  return value
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;")
    .replace(/\//g, "&#x2F;")
    .trim();
}

function sanitizeObject(obj, excludeFields = new Set()) {
  if (!obj || typeof obj !== "object") return obj;
  const sanitized = {};
  for (const [key, value] of Object.entries(obj)) {
    if (excludeFields.has(key)) {
      sanitized[key] = value;
    } else if (typeof value === "string") {
      sanitized[key] = sanitizeInput(value);
    } else if (Array.isArray(value)) {
      sanitized[key] = value.map((item) => (typeof item === "string" ? sanitizeInput(item) : item));
    } else {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

function createSecurityHeaders() {
  return (req, res, next) => {
    res.set("X-Content-Type-Options", "nosniff");
    res.set("X-Frame-Options", "DENY");
    res.set("X-XSS-Protection", "0");
    res.set("Referrer-Policy", "strict-origin-when-cross-origin");
    res.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
    res.removeHeader("X-Powered-By");
    next();
  };
}

function sanitizeBody(excludeFields = []) {
  const exclude = new Set(excludeFields);
  return (req, res, next) => {
    if (req.body && typeof req.body === "object") {
      req.body = sanitizeObject(req.body, exclude);
    }
    next();
  };
}

function validatePassword(password) {
  const errors = [];
  if (!password || password.length < 8) errors.push("Password must be at least 8 characters.");
  if (password && password.length > 128) errors.push("Password must be less than 128 characters.");
  if (password && !/[A-Z]/.test(password)) errors.push("Password must contain at least one uppercase letter.");
  if (password && !/[a-z]/.test(password)) errors.push("Password must contain at least one lowercase letter.");
  if (password && !/[0-9]/.test(password)) errors.push("Password must contain at least one number.");
  if (password && !/[^A-Za-z0-9]/.test(password)) errors.push("Password must contain at least one special character.");
  return errors;
}

function validateEmail(email) {
  if (!email) return ["Email is required."];
  const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!pattern.test(email)) return ["Email address is invalid."];
  if (email.length > 254) return ["Email address is too long."];
  return [];
}

function createValidationMiddleware(validators) {
  return (req, res, next) => {
    const errors = [];
    for (const [field, rules] of Object.entries(validators)) {
      const value = req.body?.[field];
      for (const rule of rules) {
        const result = rule(value, req.body);
        if (result) errors.push(result);
      }
    }
    if (errors.length) {
      return res.status(400).json({ message: "Validation failed", errors });
    }
    next();
  };
}

export { createSecurityHeaders, sanitizeBody, validatePassword, validateEmail, createValidationMiddleware, sanitizeInput };
