import mongoose from "mongoose";
import logger from "./logger.js";

const MONGO_OPTIONS = {
  maxPoolSize: parseInt(process.env.MONGO_MAX_POOL_SIZE || "10", 10),
  minPoolSize: parseInt(process.env.MONGO_MIN_POOL_SIZE || "2", 10),
  serverSelectionTimeoutMS: 5000,
  socketTimeoutMS: 45000,
  family: 4,
  retryWrites: true,
  retryReads: true
};

async function connectMongo(uri, options = {}) {
  const opts = { ...MONGO_OPTIONS, ...options };

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
