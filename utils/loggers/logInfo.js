const { info } = require('../colors');

function logInfo(message) {
  console.log(`\n${info('[INFO]')} ${message}`);
}

module.exports = { logInfo };
