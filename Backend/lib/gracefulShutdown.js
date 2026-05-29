import logger from "./logger.js";
import { disconnectMongo } from "./mongo.js";

let shuttingDown = false;

function gracefulShutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;

  logger.info(`${signal} received — starting graceful shutdown`);

  const timeout = setTimeout(() => {
    logger.error("Graceful shutdown timed out, forcing exit");
    process.exit(1);
  }, 10000);

  disconnectMongo()
    .then(() => {
      logger.info("Graceful shutdown complete");
      clearTimeout(timeout);
      process.exit(0);
    })
    .catch((err) => {
      logger.error("Error during graceful shutdown", { error: err.message });
      clearTimeout(timeout);
      process.exit(1);
    });
}

function setupGracefulShutdown(server) {
  process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
  process.on("SIGINT", () => gracefulShutdown("SIGINT"));

  process.on("uncaughtException", (err) => {
    logger.error("Uncaught exception", { error: err.message, stack: err.stack });
    gracefulShutdown("uncaughtException");
  });

  process.on("unhandledRejection", (reason) => {
    logger.error("Unhandled rejection", { reason: String(reason) });
  });

  if (server) {
    server.on("close", () => logger.info("HTTP server closed"));
  }
}

export default setupGracefulShutdown;
