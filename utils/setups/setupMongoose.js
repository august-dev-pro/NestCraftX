const { runCommand } = require("../shell");
const path = require("path");
const { createFile, updateFile } = require("../userInput");
const { logSuccess } = require("../loggers/logSuccess");
const { logInfo } = require("../loggers/logInfo");

async function setupMongoose(inputs) {
  logInfo("📦 Installation de Mongoose et @nestjs/mongoose...");
  runCommand(
    "npm install @nestjs/mongoose mongoose",
    "Mongoose inetaller avec succes !"
  );

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

  if (inputs.isDemo) {
    await setupMongooseSeeding(inputs);
  }

  logSuccess("Mongoose configuré et injecté dans app.module.ts !");
}
async function setupMongooseSeeding(inputs) {
  logInfo("⚙️ Configuration du seeding pour Mongoose...");

  // --- Dépendances ---
  const mongooseDevDeps = ["ts-node", "@types/node", "@types/bcrypt"];
  await runCommand(
    `${inputs.packageManager} add -D ${mongooseDevDeps.join(" ")}`,
    "❌ Échec de l'installation des dépendances de seeding Mongoose"
  );
  await runCommand(
    `${inputs.packageManager} install bcrypt`,
    "❌ Échec de l'installation de bcrypt"
  );

  // --- Scripts dans package.json ---
  const mongooseScripts = {
    seed: "ts-node src/database/seed.ts",
  };
  await updatePackageJson(inputs, mongooseScripts);

  // --- Création du fichier seed.ts ---
  await createDirectory("src/database");
  const seedTsContent = generateMongooseSeedContent(
    inputs.entitiesData.entities
  );

  await createFile({
    path: `src/database/seed.ts`,
    content: seedTsContent,
  });

  logSuccess("✅ Seeding Mongoose configuré.");
}

function generateMongooseSeedContent(entities) {
  return `/**
 * 🚀 Script de seeding pour Mongoose
 * Généré automatiquement par NestCraftX
 * ------------------------------------
 * Ce script insère des données d'exemple dans la base MongoDB.
 * Commande : npm run seed
 */

import mongoose from 'mongoose';
import bcrypt from 'bcrypt';
${entities
  .map(
    (e) =>
      `import { ${
        e.name
      }Schema } from '../modules/${e.name.toLowerCase()}/${e.name.toLowerCase()}.schema';`
  )
  .join("\n")}

async function connectDB() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/${
    entities[0]?.name?.toLowerCase() || "app"
  }_db';
  await mongoose.connect(MONGO_URI);
  console.log('✅ Connecté à MongoDB');
}

async function seed() {
  try {
    await connectDB();

${entities
  .map((entity) => {
    const modelVar = `${entity.name}Model`;
    const dataVar = `${entity.name.toLowerCase()}Data`;
    return `
    // --- ${entity.name} ---
    const ${modelVar} = mongoose.model('${entity.name}', ${entity.name}Schema);
    const ${dataVar} = [
      ${generateSampleData(entity)}
    ];
    await ${modelVar}.insertMany(${dataVar});
    console.log('✅ Données ${entity.name} insérées');
    `;
  })
  .join("\n")}

    console.log('🎉 Seeding terminé avec succès.');
    await mongoose.disconnect();
  } catch (err) {
    console.error('❌ Erreur lors du seeding :', err);
    process.exit(1);
  }
}

seed();
`;
}

/**
 * Génère un exemple de données pour chaque entité
 */
function generateSampleData(entity) {
  const fields = entity.fields || [];
  const sampleObj = fields
    .map((f) => {
      if (f.name.toLowerCase().includes("password")) {
        return `${f.name}: await bcrypt.hash('password123', 10)`;
      }
      if (f.type === "string") return `${f.name}: '${f.name}_example'`;
      if (f.type === "number")
        return `${f.name}: ${Math.floor(Math.random() * 100)}`;
      if (f.type === "boolean") return `${f.name}: true`;
      return `${f.name}: null`;
    })
    .join(",\n      ");

  return `{ ${sampleObj} }`;
}
module.exports = { setupMongoose };
