const { warning } = require("../colors");

function logWarning(message) {
  console.log(`\n${warning("⚠️[Warning]")} ${message}`);
}

module.exports = { logWarning };
