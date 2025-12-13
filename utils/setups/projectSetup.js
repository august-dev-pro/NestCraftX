const { logInfo } = require("../loggers/logInfo");
const { runCommand } = require("../shell");
const fs = require("fs");

async function createProject(inputs) {
  if (fs.existsSync(inputs.projectName)) {
    console.log("⚠️ Project already exists.");

    const confirmation = readlineSync.keyInYNStrict(
      `The folder '${inputs.projectName}' already exists. Do you want to delete it and proceed? `
    );

    if (confirmation) {
      // confirmation is true if the user presses 'y'
      console.log("Deleting existing project...");
      fs.rmSync(inputs.projectName, { recursive: true, force: true });
    } else {
      console.log("Operation cancelled by user. Exiting.");
      return; // Stop function execution if the user cancels
    }
  }

  logInfo(`Creating NestJS project: ${inputs.projectName}`);

  // Remains asynchronous as runCommand likely involves external processes (npm/npx)
  await runCommand(
    `npx @nestjs/cli new ${inputs.projectName} --package-manager ${inputs.packageManager}`,
    "Failed to create NestJS project"
  );

  // Changing the current process directory to the project root
  process.chdir(inputs.projectName);

  // Installing dependencies
  logInfo("Installing dependencies...");

  // Remains asynchronous as runCommand likely involves external processes (npm/npx)
  await runCommand(
    `${inputs.packageManager} add @nestjs/config class-validator class-transformer`,
    "Failed to install dependencies"
  );
}

module.exports = { createProject };
