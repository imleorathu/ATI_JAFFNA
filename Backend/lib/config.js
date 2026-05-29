import logger from "./logger.js";

const REQUIRED_VARS = ["JWT_SECRET"];
const OPTIONAL_VARS = {
  PORT: "5000",
  MONGODB_URI: "mongodb://127.0.0.1:27017/ATI_Jaffna",
  CLIENT_URL: "http://127.0.0.1:5173",
  NODE_ENV: "development",
  LOG_LEVEL: undefined,
  SEED_DEFAULT_ADMIN: "true",
  DEFAULT_ADMIN_EMAIL: "admin@atijaffna.edu.lk",
  DEFAULT_ADMIN_PASSWORD: "Admin@12345",
  DEFAULT_ADMIN_NAME: "ATI Jaffna Admin",
  GROQ_API_KEY: undefined,
  GROQ_MODEL: "llama-3.3-70b-versatile",
  GROQ_TEMPERATURE: "0.2",
  GROQ_MAX_COMPLETION_TOKENS: "1200",
  ATI_CAMPUS_LAT: "9.651841",
  ATI_CAMPUS_LNG: "80.023445",
  ATTENDANCE_RADIUS_METERS: "500",
  AUTO_START_MONGO: "true",
  MONGODB_DATA_PATH: undefined,
  MONGODB_LOG_PATH: undefined,
  BCRYPT_ROUNDS: "10",
  CORS_ORIGINS: "",
  MAX_JSON_BODY: "10mb",
  TRUST_PROXY: "false"
};

function validateEnv() {
  const missing = REQUIRED_VARS.filter((key) => !process.env[key]);
  if (missing.length) {
    logger.error("Missing required environment variables", { keys: missing });
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }

  if (process.env.JWT_SECRET === "dev-secret" || process.env.JWT_SECRET?.length < 32) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("JWT_SECRET must be at least 32 characters in production");
    }
    logger.warn("JWT_SECRET is weak. Set a strong secret in production.");
  }
}

function getConfig() {
  const config = {
    port: parseInt(process.env.PORT || OPTIONAL_VARS.PORT, 10),
    mongoUri: process.env.MONGODB_URI || OPTIONAL_VARS.MONGODB_URI,
    clientUrl: process.env.CLIENT_URL || OPTIONAL_VARS.CLIENT_URL,
    nodeEnv: process.env.NODE_ENV || OPTIONAL_VARS.NODE_ENV,
    logLevel: process.env.LOG_LEVEL || OPTIONAL_VARS.LOG_LEVEL,
    jwtSecret: process.env.JWT_SECRET,
    seedDefaultAdmin: process.env.SEED_DEFAULT_ADMIN !== "false",
    defaultAdminEmail: process.env.DEFAULT_ADMIN_EMAIL || OPTIONAL_VARS.DEFAULT_ADMIN_EMAIL,
    defaultAdminPassword: process.env.DEFAULT_ADMIN_PASSWORD || OPTIONAL_VARS.DEFAULT_ADMIN_PASSWORD,
    defaultAdminName: process.env.DEFAULT_ADMIN_NAME || OPTIONAL_VARS.DEFAULT_ADMIN_NAME,
    groqApiKey: process.env.GROQ_API_KEY,
    groqModel: process.env.GROQ_MODEL || OPTIONAL_VARS.GROQ_MODEL,
    groqTemperature: parseFloat(process.env.GROQ_TEMPERATURE || OPTIONAL_VARS.GROQ_TEMPERATURE),
    groqMaxTokens: parseInt(process.env.GROQ_MAX_COMPLETION_TOKENS || OPTIONAL_VARS.GROQ_MAX_COMPLETION_TOKENS, 10),
    campusLat: parseFloat(process.env.ATI_CAMPUS_LAT || OPTIONAL_VARS.ATI_CAMPUS_LAT),
    campusLng: parseFloat(process.env.ATI_CAMPUS_LNG || OPTIONAL_VARS.ATI_CAMPUS_LNG),
    attendanceRadius: parseInt(process.env.ATTENDANCE_RADIUS_METERS || OPTIONAL_VARS.ATTENDANCE_RADIUS_METERS, 10),
    autoStartMongo: process.env.AUTO_START_MONGO !== "false",
    mongoDataPath: process.env.MONGODB_DATA_PATH,
    mongoLogPath: process.env.MONGODB_LOG_PATH,
    bcryptRounds: parseInt(process.env.BCRYPT_ROUNDS || OPTIONAL_VARS.BCRYPT_ROUNDS, 10),
    corsOrigins: (process.env.CORS_ORIGINS || OPTIONAL_VARS.CORS_ORIGINS)
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean),
    maxJsonBody: process.env.MAX_JSON_BODY || OPTIONAL_VARS.MAX_JSON_BODY,
    trustProxy: process.env.TRUST_PROXY === "true"
  };

  config.allowedOrigins = [
    config.clientUrl,
    "http://127.0.0.1:5173",
    "http://localhost:5173",
    ...config.corsOrigins
  ].filter(Boolean);

  return config;
}

export { validateEnv, getConfig };
