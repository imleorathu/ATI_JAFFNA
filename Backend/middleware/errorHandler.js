import logger from "../lib/logger.js";

const isDev = process.env.NODE_ENV !== "production";

function sanitizeStack(stack) {
  if (!isDev) return undefined;
  return stack;
}

function formatError(error) {
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern || error.keyValue || {})[0] || "field";
    return { status: 409, message: `Another record already uses this ${field}.`, code: "DUPLICATE_ENTRY" };
  }

  if (error.name === "ValidationError" && error.errors) {
    const details = Object.values(error.errors).map((e) => ({
      field: e.path,
      message: e.message
    }));
    return { status: 400, message: "Validation failed", details, code: "VALIDATION_ERROR" };
  }

  if (error.name === "CastError") {
    return { status: 400, message: `Invalid ${error.kind} value for ${error.path}.`, code: "INVALID_VALUE" };
  }

  if (error.name === "JsonWebTokenError") {
    return { status: 401, message: "Invalid token.", code: "INVALID_TOKEN" };
  }

  if (error.name === "TokenExpiredError") {
    return { status: 401, message: "Token has expired.", code: "TOKEN_EXPIRED" };
  }

  if (error.name === "MulterError") {
    return { status: 400, message: error.message, code: "UPLOAD_ERROR" };
  }

  if (error.status) {
    return { status: error.status, message: error.message, code: error.code };
  }

  return { status: 500, message: "An internal server error occurred.", code: "INTERNAL_ERROR" };
}

export default function errorHandler(error, req, res, next) {
  const { status, message, code, details } = formatError(error);

  if (status >= 500) {
    logger.error("Unhandled server error", {
      method: req.method,
      url: req.url,
      error: error.message,
      stack: error.stack,
      body: req.body ? Object.keys(req.body) : undefined
    });
  } else {
    logger.warn("Client error response", {
      method: req.method,
      url: req.url,
      status,
      message,
      code
    });
  }

  const response = { message, code };
  if (details) response.details = details;
  if (isDev && error.stack) response.stack = error.stack;

  res.status(status).json(response);
}
