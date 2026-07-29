import mongoose from "mongoose";
import logger from "./logger.js";

function getMongoOptions() {
  return {
    // Imports run before server.js loads .env, so resolve these at connection time.
    maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || "10", 10),
    minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || "2", 10),
    serverSelectionTimeoutMS: parseInt(process.env.MONGO_SERVER_SELECTION_TIMEOUT_MS || "5000", 10),
    socketTimeoutMS: parseInt(process.env.MONGO_SOCKET_TIMEOUT_MS || "45000", 10),
    family: 4,
    retryWrites: true,
    retryReads: true
  };
}

async function connectMongo(uri, options = {}) {
  const opts = { ...getMongoOptions(), ...options };

  mongoose.connection.on("connected", () => logger.info("MongoDB connected", { db: mongoose.connection.name }));
  mongoose.connection.on("error", (err) => logger.error("MongoDB connection error", { error: err.message }));
  mongoose.connection.on("disconnected", () => logger.warn("MongoDB disconnected"));
  mongoose.connection.on("reconnected", () => logger.info("MongoDB reconnected"));

  if (process.env.NODE_ENV === "development") {
    mongoose.set("debug", (collection, method, ...args) => {
      logger.debug("MongoDB query", { collection, method, args: args.map((a) => JSON.stringify(a).slice(0, 200)) });
    });
  }

  await mongoose.connect(uri, opts);
  return mongoose.connection;
}

async function disconnectMongo() {
  await mongoose.disconnect();
  logger.info("MongoDB disconnected (graceful)");
}

export { connectMongo, disconnectMongo };
