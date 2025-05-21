// setupTypeORM.js
const { execSync } = require("child_process");
// const path = require("path");
const {
  updateFile,
  capitalize,
  createFile,
  createDirectory,
} = require("../../userInput");
const { logInfo } = require("../../loggers/logInfo");
const { logSuccess } = require("../../loggers/logSuccess");
const path = require("path");

async function setupTypeORM(inputs) {
  logInfo("📦 Installation de TypeORM et des dépendances PostgreSQL...");
  execSync("npm install @nestjs/typeorm typeorm pg reflect-metadata", {
    stdio: "inherit",
  });

  const dbConfig = inputs.dbConfig;

  // Création du fichier .env avec les valeurs dynamiques
  const envContent = `
DB_HOST=${dbConfig.POSTGRES_HOST}
DB_PORT=${dbConfig.POSTGRES_PORT}
DB_USERNAME=${dbConfig.POSTGRES_USER}
DB_PASSWORD=${dbConfig.POSTGRES_PASSWORD}
DB_DATABASE=${dbConfig.POSTGRES_DB}
  `.trim();
  await createFile({
    path: ".env",
    contente: envContent,
  });

  // Mise à jour de app.module.ts avec TypeORM
  const appModulePath = "src/app.module.ts";
  const typeOrmImport = `import { TypeOrmModule } from '@nestjs/typeorm';`;
  const typeOrmConfig = `
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  autoLoadEntities: true,
  synchronize: true,
}),`;

  logInfo("⚙️ Mise à jour de app.module.ts avec TypeORM...");
  await updateFile({
    path: appModulePath,
    pattern: `ConfigModule.forRoot({
      isGlobal: true, // Rendre ConfigModule accessible globalement
      envFilePath: '.env', // Charger les variables d'environnement
    }),`,
    replacement: ` ConfigModule.forRoot({
      isGlobal: true, // Rendre ConfigModule accessible globalement
      envFilePath: '.env', // Charger les variables d'environnement
    }),

    ${typeOrmConfig}`,
  });

  await updateFile({
    path: appModulePath,
    pattern: "import { Module } from '@nestjs/common';",
    replacement: `import { Module } from '@nestjs/common';
        ${typeOrmImport}`,
  });

  // Génération des entités
  logInfo("📁 Génération des entités à typeorm...");

  await createDirectory("src/entities");

  for (const entity of inputs.entitiesData.entities) {
    const entityName = capitalize(entity.name);
    const fields = entity.fields
      .map((field) => {
        const decorators = ["@Column()"];
        if (field.name === "id")
          decorators.unshift("@PrimaryGeneratedColumn()");
        return `${decorators.join("\n  ")}\n  ${field.name}: ${field.type};`;
      })
      .join("\n\n  ");

    const content = `import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('${entity.name}')
export class ${entityName} {
  @PrimaryGeneratedColumn('uuid') // ou 'increment'
  id: string;

  ${fields}
}`;

    await createFile({
      path: `src/entities/${entityName}.entity.ts`,
      contente: content,
    });
  }

  // Création de la base de données PostgreSQL
  try {
    logInfo("🛠️ Création de la base de données PostgreSQL...");
    execSync(
      `set PGPASSWORD=${dbConfig.POSTGRES_PASSWORD} && psql -U ${dbConfig.POSTGRES_USER} -h ${dbConfig.POSTGRES_HOST} -p ${dbConfig.POSTGRES_PORT} -c "CREATE DATABASE ${dbConfig.POSTGRES_DB};"`,
      { stdio: "inherit" }
    );
  } catch (error) {
    console.warn(
      "⚠️ Impossible de créer la base (elle existe peut-être déjà)."
    );
  }

  logSuccess("✅ Configuration TypeORM terminée. Prêt à coder !");
}

module.exports = { setupTypeORM };
