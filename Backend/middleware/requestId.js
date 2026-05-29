import { randomUUID } from "crypto";

/**
 * Request ID middleware for request tracing and correlation.
 * Adds a unique X-Request-ID header to each request for:
 * - Log correlation across services
 * - Debugging and troubleshooting
 * - Client-side error reporting
 */
function requestId(req, res, next) {
  // Use existing request ID from header (from load balancer/client) or generate new one
  const id = req.headers["x-request-id"] || randomUUID();
  
  // Attach to request object for use in controllers
  req.requestId = id;
  
  // Set response header for client correlation
  res.setHeader("X-Request-ID", id);
  
  next();
}

export { requestId };