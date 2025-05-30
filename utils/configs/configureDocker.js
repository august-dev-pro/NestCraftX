const fs = require("fs");
const { logInfo } = require("../loggers/logInfo");
const { logSuccess } = require("../loggers/logSuccess");

async function configureDocker(inputs) {
  logInfo("Génération des fichiers Docker...");

  const dockerfileContent = `FROM node:18\nWORKDIR /app\nCOPY . .\nRUN ${inputs.packageManager} install\nCMD ["${inputs.packageManager}", "run", "start"]`;
  fs.writeFileSync("Dockerfile", dockerfileContent);

  const dockerComposeContent = `version: '3'\nservices:\n  db:\n    image: postgres\n    restart: always\n    environment:\n      POSTGRES_USER: ${inputs.dbConfig.POSTGRES_USER}\n      POSTGRES_PASSWORD: ${inputs.dbConfig.POSTGRES_PASSWORD}\n      POSTGRES_DB: ${inputs.dbConfig.POSTGRES_DB}\n    ports:\n      - "5432:5432"`;
  fs.writeFileSync("docker-compose.yml", dockerComposeContent);

  logSuccess("Docker Configuré avec succès");
}
module.exports = { configureDocker };
