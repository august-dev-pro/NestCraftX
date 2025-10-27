const { success } = require('../colors');

function logSuccess(message) {
  console.log(`\n${success('[SUCCESS]')} ${message}`);
}

module.exports = { logSuccess };
