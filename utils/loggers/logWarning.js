const { warning } = require("../colors");

function logWarning(message) {
  console.log(`\n${warning("⚠️[INFO]")} ${message}`);
}

module.exports = { logWarning };
