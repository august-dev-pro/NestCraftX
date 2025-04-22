const { execSync } = require("child_process");
const fs = require("fs");
const { logError } = require("./loggers/logError");
// const { logError } = require("./loggers/logger");

async function runCommand(command, errorMessage) {
  try {
    execSync(command, { stdio: "inherit" });
  } catch (error) {
    logError(errorMessage);
    fs.appendFileSync(
      "setup.log",
      `[Erreur] ${errorMessage}: ${error.message}\n`
    );
    process.exit(1);
  }
}

module.exports = { runCommand };
