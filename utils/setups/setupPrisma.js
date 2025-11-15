const fs = require("fs");
const { logInfo } = require("../loggers/logInfo");
const { runCommand } = require("../shell");
const { logSuccess } = require("../loggers/logSuccess");
const { createDirectory, createFile, updateFile } = require("../userInput");
const { updatePackageJson } = require("../file-utils/packageJsonUtils");

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
  let prismaConfigPath = "prisma.config.ts";
  if (!fs.existsSync(prismaConfigPath)) {
    prismaConfigPath = "prisma/prisma.config.ts";
  }

  if (fs.existsSync(prismaConfigPath)) {
    logInfo("📝 Mise à jour de prisma.config.ts avec l'import dotenv...");
    await updateFile({
      path: prismaConfigPath,
      pattern: /^/,
      replacement: `import 'dotenv/config';\n\n`,
    });
  }

  // ⚙️ Étape 7 : Génération du client Prisma
  await runCommand("npx prisma generate", "❌ Échec de la génération Prisma");

  // ⚙️ Étape 8 : Migration (UNIQUEMENT en mode 'new')
  if (inputs.isDemo) {
    setupPrismaSeeding(inputs);
  }

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

async function setupPrismaSeeding(inputs) {
  logInfo("⚙️ Configuration du seeding pour Prisma...");

  // --- Dépendances ---
  const prismaDevDeps = [
    "ts-node",
    "@types/node",
    "@types/bcrypt",
    "dotenv-cli",
  ];
  await runCommand(
    `${inputs.packageManager} add -D ${prismaDevDeps.join(" ")}`,
    "❌ Échec de l'installation des dépendances de seeding Prisma"
  );
  // Bcrypt est souvent une dépendance de production pour le hachage
  await runCommand(
    `${inputs.packageManager} install bcrypt`,
    "❌ Échec de l'installation de bcrypt"
  );

  // --- Scripts dans package.json ---
  const prismaScripts = {
    "prisma:migrate": "npx prisma migrate dev --name init",
    "prisma:seed": "npx prisma db seed",
    seed: `ts-node prisma/seed.ts`,
  };

  await updatePackageJson(inputs, prismaScripts);

  // --- Configuration dans schema.prisma ---
  await updateFile({
    path: "prisma/schema.prisma",
    pattern: /generator client \{[^}]*\}/g,
    replacement: `generator client {
  provider = "prisma-client-js"
  output   = "../node_modules/.prisma/client"
}

`,
  });

  // --- Création du fichier seed.ts ---
  const seedTsContent = generatePrismaSeedContent(inputs.entitiesData.entities);
  await createFile({
    path: `prisma/seed.ts`,
    contente: seedTsContent,
  });

  logSuccess("✅ Seeding Prisma configuré.");
}

function generatePrismaSeedContent(entities) {
  const requiresBcrypt = entities.some((e) => e.name.toLowerCase() === "user");

  return `
import { PrismaClient } from '@prisma/client';
${requiresBcrypt ? "import * as bcrypt from 'bcrypt';" : ""}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Démarrage du seeding pour Prisma...');

  // --- 1. UTILISATEUR ADMIN ---
  ${
    requiresBcrypt
      ? `const salt = await bcrypt.genSalt(10);
  const hashedPassword = await bcrypt.hash('password123', salt);`
      : ""
  }

  const adminUser = await prisma.user.create({
     data: {
      email: 'admin@nestcraft.com',
      ${
        requiresBcrypt
          ? "password: hashedPassword,"
          : "// Mot de passe par défaut: password123"
      }
      username: 'NestCraftAdmin',
      role: 'SUPER_ADMIN',
      isActive: true,
    },
  });
  console.log(\`👑 Admin créé: \${adminUser.email}\`);

  // --- 2. UTILISATEURS DÉMO ---
  const demoUsersData = [
    { email: 'emma.jones@demo.com', ${
      requiresBcrypt ? "password: hashedPassword," : ""
    } username: 'EmmaJones', isActive: true },
    { email: 'lucas.martin@demo.com', ${
      requiresBcrypt ? "password: hashedPassword," : ""
    } username: 'LucasMartin', isActive: true },
    { email: 'sophia.bernard@demo.com', ${
      requiresBcrypt ? "password: hashedPassword," : ""
    } username: 'SophiaBernard', isActive: true },
    { email: 'alexandre.dubois@demo.com', ${
      requiresBcrypt ? "password: hashedPassword," : ""
    } username: 'AlexandreDubois', isActive: true },
    { email: 'chloe.moreau@demo.com', ${
      requiresBcrypt ? "password: hashedPassword," : ""
    } username: 'ChloeMoreau', isActive: true },
  ];

  await prisma.user.createMany({ data: demoUsersData, skipDuplicates: true });
  console.log('👥 Utilisateurs démo créés.');

  const allUsers = await prisma.user.findMany({ select: { id: true } });
  const userIds = allUsers.map(u => u.id);

  // --- 3. ARTICLES DE BLOG ---
  const postsData = [
    {
      title: 'Les bases de NestJS pour les développeurs modernes',
      content: 'Découvrez comment construire une API robuste et maintenable avec NestJS...',
      published: true,
      authorId: userIds[1],
    },
    {
      title: 'Comment sécuriser votre API avec JWT',
      content: 'L’authentification JWT est un standard pour sécuriser les APIs...',
      published: true,
      authorId: userIds[2],
    },
    {
      title: 'Optimiser les performances d’une API Node.js',
      content: 'Découvrez les meilleures pratiques pour améliorer les performances...',
      published: true,
      authorId: userIds[3],
    },
    {
      title: 'Introduction à Prisma ORM',
      content: 'Prisma est un ORM moderne qui simplifie les interactions avec la base de données...',
      published: true,
      authorId: userIds[4],
    },
    {
      title: 'Comprendre la Clean Architecture',
      content: 'La Clean Architecture permet de séparer la logique métier du reste du code...',
      published: false,
      authorId: userIds[0],
    },
  ];
  await prisma.post.createMany({ data: postsData, skipDuplicates: true });
  console.log('📝 Articles créés.');

  const allPosts = await prisma.post.findMany({ select: { id: true } });
  const postIds = allPosts.map(p => p.id);

  // --- 4. COMMENTAIRES DÉMO ---
  const commentsData = [
    { content: 'Excellent article ! J’ai pu appliquer ces conseils directement sur mon projet NestJS.', postId: postIds[0], authorId: userIds[2] },
    { content: 'Très clair et bien expliqué, merci pour le partage sur Prisma 👏', postId: postIds[3], authorId: userIds[0] },
    { content: 'Je ne connaissais pas JWT avant cet article, c’est une vraie révélation.', postId: postIds[1], authorId: userIds[4] },
    { content: 'La Clean Architecture m’a toujours paru floue, cet article m’a enfin éclairé.', postId: postIds[4], authorId: userIds[1] },
    { content: 'Merci pour ce contenu ! J’aimerais voir un tutoriel complet avec NestJS + Prisma.', postId: postIds[2], authorId: userIds[3] },
  ];
  await prisma.comment.createMany({ data: commentsData, skipDuplicates: true });
  console.log('💬 Commentaires créés.');

  console.log('✅ Seeding terminé avec succès ! 🚀');
}

main()
  .catch((e) => {
    console.error('❌ Erreur lors du seeding Prisma:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
`;
}

module.exports = { setupPrisma };
