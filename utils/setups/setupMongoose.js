const { execSync } = require("child_process");
const path = require("path");
const { createFile, updateFile } = require("../userInput");
const { logSuccess } = require("../loggers/logSuccess");
const { logInfo } = require("../loggers/logInfo");

async function setupMongoose(inputs) {
  logInfo("📦 Installation de Mongoose et @nestjs/mongoose...");
  execSync("npm install @nestjs/mongoose mongoose", { stdio: "inherit" });

  // Génération du fichier .env
  const envContent = `
MONGO_URI=${inputs.dbConfig.MONGO_URI}
MONGO_DB=${inputs.dbConfig.MONGO_DB}
  `.trim();
  await createFile({ path: ".env", contente: envContent });

  // Ajout de l'import et de la configuration Mongoose dans app.module.ts
  const appModulePath = path.join("src", "app.module.ts");
  const mongooseImport = `import { MongooseModule } from '@nestjs/mongoose';`;

  // Ajoute l'import si absent
  await updateFile({
    path: appModulePath,
    pattern: /import {[\s\S]*?} from '@nestjs\/config';/,
    replacement: (match) => `${match}\n${mongooseImport}`,
  });

  // Ajoute la configuration MongooseModule dans les imports
  const importsPattern =
    /imports:\s*\[[\s\S]*?ConfigModule\.forRoot\([\s\S]*?\),/;
  await updateFile({
    path: appModulePath,
    pattern: importsPattern,
    replacement: (match) =>
      `${match}
    MongooseModule.forRoot(process.env.MONGO_URI || " ", {
      dbName: process.env.MONGO_DB,
    }),`,
  });

  logSuccess("Mongoose configuré et injecté dans app.module.ts !");
}

module.exports = { setupMongoose };
