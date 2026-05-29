import logger from "../lib/logger.js";

function requestLogger(req, res, next) {
  const start = Date.now();
  const { method, url, ip } = req;

  const originalEnd = res.end;
  res.end = function (...args) {
    originalEnd.apply(res, args);

    const duration = Date.now() - start;
    const status = res.statusCode;
    const level = status >= 500 ? "error" : status >= 400 ? "warn" : "debug";

    logger[level]("HTTP request", {
      method,
      url,
      status,
      durationMs: duration,
      ip,
      userAgent: req.get("User-Agent") || "unknown",
      contentLength: res.get("Content-Length") || "0"
    });
  };

  next();
}

export default requestLogger;
