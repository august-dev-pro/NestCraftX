const { execSync } = require("child_process");
const fs = require("fs");
const { logError } = require("./loggers/logError");
const { spinner } = require("./spinner");

async function runCommand(command, errorMessage, spinnerText = null) {
  const spin = spinnerText ? spinner(spinnerText) : null;

  try {
    if (spin) spin.start();
    execSync(command, { stdio: spinnerText ? "pipe" : "inherit" });
    if (spin) spin.succeed(spinnerText);
  } catch (error) {
    if (spin) spin.fail(errorMessage);
    logError(errorMessage);
    fs.appendFileSync(
      "setup.log",
      `[Erreur] ${errorMessage}: ${error.message}\n`
    );
    process.exit(1);
  }
}

async function runCommandSilent(command) {
  try {
    return execSync(command, { stdio: "pipe" }).toString();
  } catch (error) {
    return null;
  }
}

module.exports = { runCommand, runCommandSilent };
