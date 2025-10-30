// const fs = require("fs");
// const { execSync } = require("child_process");
const { logInfo } = require("../loggers/logInfo");
const { runCommand } = require("../shell");
const { logSuccess } = require("../loggers/logSuccess");
const { createDirectory, createFile, updateFile } = require("../userInput");

async function setupPrisma(inputs) {
  logInfo("🚀 Configuration de Prisma...");

  const dbConfig = inputs.dbConfig;
  // 📌 Chemin du schema.prisma
  const schemaPath = "prisma/schema.prisma";

  // 📌 Pattern correspondant à la datasource existante (créée par défaut par `npx prisma init`)
  const pattern = `datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}`;

  // 📦 Étape 1 : Installation de Prisma et de son client
  await runCommand(
    `${inputs.packageManager} add -D prisma @prisma/client`,
    "❌ Échec de l'installation de Prisma"
  );

  // ⚙️ Étape 2 : Initialisation de Prisma
  logInfo("initialisation de prisma");
  await runCommand("npx prisma init", "❌ Échec de l'initialisation de Prisma");

  await updateFile({
    path: schemaPath,
    pattern: /generator client \{[^}]*\}/g,
    replacement: `generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client" //
}`,
  });

  // 📁 Étape 3 : Configuration de l'environnement (fichiers .env et .env.example)
  const envPath = ".env";
  const exampleEnvPath = ".env.example";
  const databaseUrl = `DATABASE_URL="postgresql://${dbConfig.POSTGRES_USER}:${dbConfig.POSTGRES_PASSWORD}@${dbConfig.POSTGRES_HOST}:${dbConfig.POSTGRES_PORT}/${dbConfig.POSTGRES_DB}?schema=public"`;
  const exampleDatabaseUrl = `DATABASE_URL="postgresql://user:password@localhost:5432/dbName?schema=public"`;

  await createFile({
    path: envPath,
    contente: databaseUrl,
  });

  await createFile({
    path: exampleEnvPath,
    contente: exampleDatabaseUrl,
  });

  // 🧱 Étape 4 : Génération des modèles Prisma à partir des entités fournies
  logInfo("ajout des entités");
  let schemaContent = "";

  // Détection de la présence de l'entité User
  const hasUserEntity = inputs.entitiesData.entities.some(
    (entity) => entity.name.toLowerCase() === "user"
  );

  // Ajout du bloc enum Role si User est présent
  if (hasUserEntity) {
    schemaContent += `
/**
 * Enumération des rôles
 */
enum Role {
  USER
  ADMIN
  SUPER_ADMIN
}
`;
  }

  for (const entity of inputs.entitiesData.entities) {
    schemaContent += `
/**
 * Modèle ${entity.name}
 */
model ${entity.name} {
  id        String   @id @default(uuid())
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt`;

    for (const field of entity.fields) {
      schemaContent += `\n  ${field.name} ${mapTypeToPrisma(field.type)}`;
    }

    // Ajout du champ role uniquement pour User
    if (entity.name.toLowerCase() === "user") {
      schemaContent += `\n  role     Role     @default(USER)`;
    }

    schemaContent += `\n}\n`;
  }

  // 🔗 Ajout des relations
  if (inputs.entitiesData.relations?.length > 0) {
    for (const relation of inputs.entitiesData.relations) {
      const from = relation.from;
      const to = relation.to;
      const type = relation.type;

      // Mise à jour du modèle source
      schemaContent = schemaContent.replace(
        new RegExp(`model ${from} \\{`),
        (match) => {
          if (type === "1-n") {
            // Côté "one" (source) : ajoute la liste
            schemaContent = schemaContent.replace(
              new RegExp(`model ${from} {([\\s\\S]*?)}`),
              (match) => {
                const fieldLine = `${to}s ${to}[]`;
                return match.includes(fieldLine)
                  ? match
                  : `${match}\n  ${fieldLine}`;
              }
            );
            // Côté "many" (cible) : ajoute la relation et la clé étrangère si absente
            schemaContent = schemaContent.replace(
              new RegExp(`model ${to} {([\\s\\S]*?)}`),
              (match) => {
                const relationLine = `${from} ${from} @relation(fields: [${from}Id], references: [id])`;
                const fkLine = `${from}Id String`;
                let result = match.includes(relationLine)
                  ? match
                  : `${match}\n  ${relationLine}`;
                result = result.includes(fkLine)
                  ? result
                  : `${result}\n  ${fkLine}`;
                return result;
              }
            );
          }

          if (type === "n-1") {
            // Côté "many" (source) : ajoute la relation et la clé étrangère si absente
            schemaContent = schemaContent.replace(
              new RegExp(`model ${from} {([\\s\\S]*?)}`),
              (match) => {
                const relationLine = `${to} ${to} @relation(fields: [${to}Id], references: [id])`;
                const fkLine = `${to}Id String`;
                let result = match.includes(relationLine)
                  ? match
                  : `${match}\n  ${relationLine}`;
                result = result.includes(fkLine)
                  ? result
                  : `${result}\n  ${fkLine}`;
                return result;
              }
            );
            // Côté "one" (cible) : ajoute la liste
            schemaContent = schemaContent.replace(
              new RegExp(`model ${to} {([\\s\\S]*?)}`),
              (match) => {
                const fieldLine = `${from}s ${from}[]`;
                return match.includes(fieldLine)
                  ? match
                  : `${match}\n  ${fieldLine}`;
              }
            );
          }

          if (type === "1-1") {
            // Côté A
            schemaContent = schemaContent.replace(
              new RegExp(`model ${from} {([\\s\\S]*?)}`),
              (match) => {
                const relationLine = `${to} ${to} @relation(fields: [${to}Id], references: [id])`;
                const fkLine = `${to}Id String @unique`;
                let result = match.includes(relationLine)
                  ? match
                  : `${match}\n  ${relationLine}`;
                result = result.includes(fkLine)
                  ? result
                  : `${result}\n  ${fkLine}`;
                return result;
              }
            );
            // Côté B
            schemaContent = schemaContent.replace(
              new RegExp(`model ${to} {([\\s\\S]*?)}`),
              (match) => {
                const relationLine = `${from} ${from}? @relation(fields: [${from}Id], references: [id])`;
                const fkLine = `${from}Id String? @unique`;
                let result = match.includes(relationLine)
                  ? match
                  : `${match}\n  ${relationLine}`;
                result = result.includes(fkLine)
                  ? result
                  : `${result}\n  ${fkLine}`;
                return result;
              }
            );
          }

          if (type === "n-n" || type === "m-n") {
            // Pour n-n, généralement, il faut créer une table de jointure à la main.
            // Ici, on ajoute juste les listes de chaque côté si absentes.
            schemaContent = schemaContent.replace(
              new RegExp(`model ${from} {([\\s\\S]*?)}`),
              (match) => {
                const fieldLine = `${to}s ${to}[]`;
                return match.includes(fieldLine)
                  ? match
                  : `${match}\n  ${fieldLine}`;
              }
            );
            schemaContent = schemaContent.replace(
              new RegExp(`model ${to} {([\\s\\S]*?)}`),
              (match) => {
                const fieldLine = `${from}s ${from}[]`;
                return match.includes(fieldLine)
                  ? match
                  : `${match}\n  ${fieldLine}`;
              }
            );
          }

          return match;
        }
      );
    }
  }

  // 🛠 Étape 5 : Insertion des modèles dans schema.prisma (après la datasource existante)
  logInfo("mise à jour de schema.prisma");
  await updateFile({
    path: schemaPath,
    pattern: pattern, // On insère après la configuration de la datasource
    replacement: `${pattern}\n\n${schemaContent}`,
  });

  // 📁 Étape 6 : Création de la structure `src/prisma`
  const defaultPatch = "src/prisma";
  await createDirectory(defaultPatch);

  // 🧩 Service Prisma
  await createFile({
    path: `${defaultPatch}/prisma.service.ts`,
    contente: `import { Injectable } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * Service Prisma permettant d'exposer une instance globale du client Prisma
 */
@Injectable()
export class PrismaService extends PrismaClient {
  constructor() {
    super();
  }
}
`,
  });

  // 🧩 Module Prisma
  await createFile({
    path: `${defaultPatch}/prisma.module.ts`,
    contente: `import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

/**
 * Module Prisma global pour fournir le service à l'ensemble de l'application
 */
@Global()
@Module({
  providers: [PrismaService],
  exports: [PrismaService],
})
export class PrismaModule {}
`,
  });

  // 🔧 Installation de dotenv si nécessaire
  logInfo("📦 Installation de dotenv...");
  await runCommand(
    `${inputs.packageManager} add dotenv`,
    "❌ Échec de l'installation de dotenv"
  );

  // 🔧 Création du fichier prisma.config.ts pour charger les variables d'environnement
  const prismaConfigPath = "prisma/prisma.config.ts";
  const prismaConfigExists = require('fs').existsSync(prismaConfigPath);

  if (prismaConfigExists) {
    logInfo("📝 Mise à jour de prisma.config.ts avec l'import dotenv...");
    await updateFile({
      path: prismaConfigPath,
      pattern: /^/,
      replacement: `import 'dotenv/config';\n\n`,
    });
  }

  // 🧹 Étape intermédiaire : Reset de la base pour éviter les erreurs de drift
  logInfo("🧹 Reset de la base de données...");
  await runCommand(
    "npx prisma migrate reset --force",
    "❌ Échec du reset de la base"
  );

  // ⚙️ Étape 7 : Génération du client Prisma
  await runCommand("npx prisma generate", "❌ Échec de la génération Prisma");

  // ⚙️ Étape 8 : Migration
  await runCommand(
    "npx prisma migrate dev --name init",
    "❌ Échec de la migration Prisma"
  );

  logSuccess("✅ Prisma configuré avec succès !");
}

function mapTypeToPrisma(type) {
  switch (type.toLowerCase()) {
    case "string":
      return "String";
    case "int":
      return "Int";
    case "float":
      return "Float";
    case "number":
      return "Float"; // ou "Int" selon le besoin
    case "boolean":
      return "Boolean";
    case "date":
      return "DateTime";
    case "role":
      return "Role";
    default:
      return "String";
  }
}

module.exports = { setupPrisma };
