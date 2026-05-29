const RATE_LIMIT_WINDOWS = new Map();

const DEFAULT_CONFIG = {
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100,
  message: "Too many requests from this IP, please try again later.",
  statusCode: 429
};

const STRICT_CONFIG = {
  windowMs: 10 * 60 * 1000, // 10 minutes
  max: 20,
  message: "Too many authentication attempts. Please try again later.",
  statusCode: 429
};

function cleanupExpiredWindows() {
  const now = Date.now();
  for (const [key, window] of RATE_LIMIT_WINDOWS.entries()) {
    if (window.resetAt < now) {
      RATE_LIMIT_WINDOWS.delete(key);
    }
  }
}

setInterval(cleanupExpiredWindows, 60 * 1000);

function createRateLimiter(config = {}) {
  const { windowMs, max, message, statusCode } = { ...DEFAULT_CONFIG, ...config };

  return function rateLimiter(req, res, next) {
    const ip = req.ip || req.connection?.remoteAddress || "unknown";
    const key = `${ip}:${req.originalUrl}`;
    const now = Date.now();

    let window = RATE_LIMIT_WINDOWS.get(key);
    if (!window || now > window.resetAt) {
      window = { count: 0, resetAt: now + windowMs };
      RATE_LIMIT_WINDOWS.set(key, window);
    }

    window.count += 1;

    res.set("X-RateLimit-Limit", String(max));
    res.set("X-RateLimit-Remaining", String(Math.max(0, max - window.count)));
    res.set("X-RateLimit-Reset", String(Math.ceil(window.resetAt / 1000)));

    if (window.count > max) {
      return res.status(statusCode).json({ message, retryAfter: Math.ceil((window.resetAt - now) / 1000) });
    }

    next();
  };
}

const generalLimiter = createRateLimiter(DEFAULT_CONFIG);
const authLimiter = createRateLimiter(STRICT_CONFIG);
const apiLimiter = createRateLimiter({ windowMs: 60 * 1000, max: 60 });

export { createRateLimiter, generalLimiter, authLimiter, apiLimiter };
