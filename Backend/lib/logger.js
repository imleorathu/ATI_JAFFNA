const LOG_LEVELS = { error: 0, warn: 1, info: 2, debug: 3, trace: 4 };
const DEFAULT_LEVEL = process.env.LOG_LEVEL || (process.env.NODE_ENV === "production" ? "info" : "debug");

function formatLevel(level) {
  return level.padEnd(5).toUpperCase();
}

function formatTimestamp() {
  return new Date().toISOString();
}

function formatMessage(level, message, meta = {}) {
  const ts = formatTimestamp();
  const lvl = formatLevel(level);
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : "";
  return `[${ts}] ${lvl} ${message}${metaStr}`;
}

function log(level, message, meta) {
  if (LOG_LEVELS[level] > LOG_LEVELS[DEFAULT_LEVEL]) return;
  const fn = level === "error" ? process.stderr.write.bind(process.stderr) : process.stdout.write.bind(process.stdout);
  fn(`${formatMessage(level, message, meta)}\n`);
}

const logger = {
  error: (message, meta) => log("error", message, meta),
  warn: (message, meta) => log("warn", message, meta),
  info: (message, meta) => log("info", message, meta),
  debug: (message, meta) => log("debug", message, meta),
  trace: (message, meta) => log("trace", message, meta),
  child: (defaults) => ({
    error: (message, meta) => log("error", message, { ...defaults, ...meta }),
    warn: (message, meta) => log("warn", message, { ...defaults, ...meta }),
    info: (message, meta) => log("info", message, { ...defaults, ...meta }),
    debug: (message, meta) => log("debug", message, { ...defaults, ...meta }),
    trace: (message, meta) => log("trace", message, { ...defaults, ...meta })
  })
};

export default logger;
