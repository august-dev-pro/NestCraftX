const { error } = require('../colors');

function logError(message) {
  console.error(`\n${error('[ERROR]')} ${message}`);
}

module.exports = { logError };
