class Logger {
  info(message, ...meta) {
    console.info(`[INFO] [${new Date().toISOString()}] ${message}`, ...meta);
  }

  warn(message, ...meta) {
    console.warn(`[WARN] [${new Date().toISOString()}] ${message}`, ...meta);
  }

  error(message, error, ...meta) {
    console.error(`[ERROR] [${new Date().toISOString()}] ${message}`, error, ...meta);
  }

  debug(message, ...meta) {
    console.debug(`[DEBUG] [${new Date().toISOString()}] ${message}`, ...meta);
  }
}

module.exports = { Logger };
