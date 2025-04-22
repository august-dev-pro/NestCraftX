function logError(message) {
  console.error(`\n \x1b[31m[ERROR] ${message}\x1b[0m`);
}

module.exports = { logError };
