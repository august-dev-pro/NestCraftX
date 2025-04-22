const { logInfo } = require("../loggers/logInfo");
const { runCommand } = require("../shell");
const fs = require("fs");

async function createProject(inputs) {
  if (fs.existsSync(inputs.projectName)) {
    console.log("⚠️ Le projet existe déjà. Suppression...");
    fs.rmSync(inputs.projectName, { recursive: true, force: true });
  }

  // creation du projet
  logInfo(`Création du projet NestJS: ${inputs.projectName}`);
  await runCommand(
    `npx @nestjs/cli new ${inputs.projectName} --package-manager ${inputs.packageManager}`,
    "Échec de la création du projet NestJS"
  );

  // pointage du process vert la racine du projet
  process.chdir(inputs.projectName);

  // installation des dependances
  logInfo("Installation des dépendances...");
  await runCommand(
    `${inputs.packageManager} add @nestjs/config @nestjs/typeorm typeorm pg class-validator class-transformer`,
    "Échec de l'installation des dépendances"
  );
}

module.exports = { createProject };
