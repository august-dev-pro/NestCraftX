const { displaySystemCheck } = require('../utils/systemCheck');

async function testCommand() {
  displaySystemCheck();
}

module.exports = testCommand;
