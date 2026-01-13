const fs = require("fs");
const { logInfo } = require("../loggers/logInfo");
const { runCommand } = require("../shell");
const { logSuccess } = require("../loggers/logSuccess");
const {
  createDirectory,
  createFile,
  updateFile,
  capitalize,
} = require("../userInput");
const { updatePackageJson } = require("../file-utils/packageJsonUtils");

async function setupPrisma(inputs) {
  logInfo("Configuring Prisma...");

  const dbConfig = inputs.dbConfig; // 📌 Path to schema.prisma
  const schemaPath = "prisma/schema.prisma"; // 📦 Step 1: Install Prisma and its client at version 6.5.0

  const prismaVersion = "6.5.0"; // Stable version for the CLI
  logInfo(`Installing prisma and client...`);
  await runCommand(
    `${inputs.packageManager} add -D prisma@${prismaVersion} @prisma/client@${prismaVersion}`,
    "❌ Prisma installation failed"
  );

  // Step 2: Initialize Prisma
  logInfo("Initializing Prisma");
  await runCommand("npx prisma init", "❌ Prisma initialization failed");

  await updateFile({
    path: schemaPath,
    pattern: /generator client \{[^}]*\}/g,
    replacement: `generator client {
   provider = "prisma-client-js"
   output  = "../node_modules/.prisma/client" //
  }`,
  });

  // Step 3: Environment Configuration (.env and .env.example files)
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

  // Step 4: Generating Prisma models from provided entities
  logInfo("Adding entities");
  let schemaContent = "";
  const hasUserEntity = inputs.entitiesData.entities.some(
    (entity) => entity.name.toLowerCase() === "user"
  );

  // Adding the Role enum block if User is present
  if (hasUserEntity) {
    schemaContent += `
  /**
  * Role enumeration
  */
  enum Role {
   USER
   ADMIN
   SUPER_ADMIN
  }
  `;
  }

  const fieldsToExcludeMap = new Map();
  for (const entity of inputs.entitiesData.entities) {
    fieldsToExcludeMap.set(entity.name.toLowerCase(), []);
  }

  if (inputs.entitiesData.relations?.length > 0) {
    for (const relation of inputs.entitiesData.relations) {
      const fromLower = relation.from.toLowerCase();
      const toLower = relation.to.toLowerCase();
      const fromCapitalized = capitalize(relation.from);
      const toCapitalized = capitalize(relation.to); // 'from' side (source)

      if (relation.type === "1-n") {
        // 'One' side: exclude the name of the other entity's list (e.g., 'articles')
        fieldsToExcludeMap.get(fromLower).push(`${toLower}s`);
      } else if (relation.type === "n-1") {
        // 'Many' side: exclude the foreign key (e.g., 'articleId') and the relation name (e.g., 'article')
        fieldsToExcludeMap.get(fromLower).push(`${toLower}id`, toLower);
      } // Add other relation types (1-1, n-n) if necessary here... // 'to' side (target)
      if (relation.type === "1-n") {
        // 'Many' side: exclude the foreign key (e.g., 'userId') and the relation name (e.g., 'user')
        fieldsToExcludeMap.get(toLower).push(`${fromLower}id`, fromLower);
      } else if (relation.type === "n-1") {
        // 'One' side: exclude the name of the other entity's list (e.g., 'comments')
        fieldsToExcludeMap.get(toLower).push(`${fromLower}s`);
      }
    }
  }
  // 2. Initial generation of models WITHOUT incorrect relationship fields
  for (const entity of inputs.entitiesData.entities) {
    const entityNameLower = entity.name.toLowerCase();
    // On utilise un Set pour suivre les noms de champs déjà écrits dans ce modèle
    const addedFields = new Set(["id", "createdat", "updatedat"]);

    schemaContent += `
    /**
    * ${entity.name} Model
    */
    model ${entity.name} {
      id        String   @id @default(uuid())
      createdAt DateTime @default(now())
      updatedAt DateTime @updatedAt`;

    const fieldsToExclude = fieldsToExcludeMap.get(entityNameLower) || [];

    for (const field of entity.fields) {
      const fieldNameLower = field.name.toLowerCase();

      // Ajout du rôle SEULEMENT s'il n'a pas été ajouté durant la boucle ci-dessus
      if (entityNameLower == "user" && !addedFields.has("role")) {
        schemaContent += `\n  role   Role   @default(USER)`;
        addedFields.add("role");
      }

      // Add email field ONLY if it was not added previously
      if (entityNameLower === "user" && !addedFields.has("email")) {
        schemaContent += `\n  email  String  @unique`;
        addedFields.add("email");
      }

      // On n'ajoute le champ que s'il n'est pas exclu ET pas déjà présent (comme id/createdAt)
      if (
        !fieldsToExclude.includes(fieldNameLower) &&
        !addedFields.has(fieldNameLower)
      ) {
        schemaContent += `\n  ${field.name} ${mapTypeToPrisma(field.type)}`;
        addedFields.add(fieldNameLower);
      }
    }

    schemaContent += `\n}\n`;
  }

  // 3. Applying relationship logic to add the CORRECT fields
  logInfo("Applying Prisma relations...");

  if (inputs.entitiesData.relations?.length > 0) {
    for (const relation of inputs.entitiesData.relations) {
      const from = relation.from;
      const to = relation.to;
      const type = relation.type;

      // The replacement must be done on the entire generated schemaContent // Using a replacement function to update the content of `schemaContent`
      if (type === "1-n") {
        // "One" side (source): adds the list (to[])
        schemaContent = schemaContent.replace(
          new RegExp(`model ${from} \{([\\s\\S]*?)\n\\}`, "m"),
          (match, content) => {
            const fieldLine = `  ${to}s ${to}[]`;
            return match.includes(fieldLine)
              ? match
              : `model ${from} {${content}\n${fieldLine}\n}`;
          }
        );

        // "Many" side (target): adds the relation and the foreign key
        schemaContent = schemaContent.replace(
          new RegExp(`model ${to} \{([\\s\\S]*?)\n\\}`, "m"),
          (match, content) => {
            const relationLine = `  ${from} ${from} @relation(fields: [${from}Id], references: [id])`;
            const fkLine = `  ${from}Id String`;
            let result = match.includes(relationLine)
              ? content
              : `${content}\n${relationLine}`;
            result = result.includes(fkLine) ? result : `${result}\n${fkLine}`;
            return `model ${to} {${result}\n}`;
          }
        );
      }

      if (type === "n-1") {
        // n-1 is the inverse of 1-n: from is the "many" and to is the "one"

        // "Many" side (source = from): adds the relation and the foreign key
        schemaContent = schemaContent.replace(
          new RegExp(`model ${from} \{([\\s\\S]*?)\n\\}`, "m"),
          (match, content) => {
            const relationLine = `  ${to} ${to} @relation(fields: [${to}Id], references: [id])`;
            const fkLine = `  ${to}Id String`;
            let result = match.includes(relationLine)
              ? content
              : `${content}\n${relationLine}`;
            result = result.includes(fkLine) ? result : `${result}\n${fkLine}`;
            return `model ${from} {${result}\n}`;
          }
        );

        // "One" side (target = to): adds the list (from[])
        schemaContent = schemaContent.replace(
          new RegExp(`model ${to} \{([\\s\\S]*?)\n\\}`, "m"),
          (match, content) => {
            const fromCapitalized = capitalize(from);
            const fieldLine = `  ${from}s ${from}[]`;
            return match.includes(fieldLine)
              ? match
              : `model ${to} {${content}\n${fieldLine}\n}`;
          }
        );
      }

      if (type === "1-1") {
        // 'from' side (source): adds the relation, foreign key, and @unique attribute
        schemaContent = schemaContent.replace(
          new RegExp(`model ${from} \{([\\s\\S]*?)\n\\}`, "m"),
          (match, content) => {
            const relationLine = `  ${to} ${to}? @relation(fields: [${to}Id], references: [id])`; // The foreign key must be unique in a 1-1 relationship, and optional for flexibility
            const fkLine = `  ${to}Id String? @unique`;

            let result = match.includes(relationLine)
              ? content
              : `${content}\n${relationLine}`;
            result = result.includes(fkLine) ? result : `${result}\n${fkLine}`;
            return `model ${from} {${result}\n}`;
          }
        );

        // 'to' side (target): adds the inverse relation (optional)
        schemaContent = schemaContent.replace(
          new RegExp(`model ${to} \{([\\s\\S]*?)\n\\}`, "m"),
          (match, content) => {
            // Inverse relation (optional because 'from' holds the FK)
            const fieldLine = `  ${from} ${from}?`;
            return match.includes(fieldLine)
              ? match
              : `model ${to} {${content}\n${fieldLine}\n}`;
          }
        );
      }

      if (type === "n-n") {
        // 'from' side (source): adds the list (to[])
        schemaContent = schemaContent.replace(
          new RegExp(`model ${from} \{([\\s\\S]*?)\n\\}`, "m"),
          (match, content) => {
            const fieldLine = `  ${to}s ${to}[]`;
            return match.includes(fieldLine)
              ? match
              : `model ${from} {${content}\n${fieldLine}\n}`;
          }
        );

        // 'to' side (target): adds the list (from[])
        schemaContent = schemaContent.replace(
          new RegExp(`model ${to} \{([\\s\\S]*?)\n\\}`, "m"),
          (match, content) => {
            const fieldLine = `  ${from}s ${from}[]`;
            return match.includes(fieldLine)
              ? match
              : `model ${to} {${content}\n${fieldLine}\n}`;
          }
        );
      }
    }
  }

  logInfo("Updating schema.prisma");
  const baseSchema = `
  generator client {
   provider = "prisma-client-js"
  }

  datasource db {
   provider = "${inputs.dbConfig.orm === "mongodb" ? "mongodb" : "postgresql"}"
   url   = env("DATABASE_URL")
  }

  ${schemaContent}
  `;
  await createFile({
    path: schemaPath,
    contente: baseSchema,
  });
  await runCommand(`npx prisma format`, "❌ Failed to format prisma schema");

  // 📁 Step 6: Creating the `src/prisma` structure
  const defaultPatch = "src/prisma";
  await createDirectory(defaultPatch);

  // 🧩 Prisma Service
  await createFile({
    path: `${defaultPatch}/prisma.service.ts`,
    contente: `import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
  import { PrismaClient } from '@prisma/client';

  /**
  * Prisma Service to expose a global instance of the Prisma client
  */
  @Injectable()
  export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
   constructor() {
     super();
   }

   async onModuleInit() {
     await this.$connect();
   }

   async onModuleDestroy() {
     await this.$disconnect();
   }
  }
  `,
  });

  // 🧩 Prisma Module
  await createFile({
    path: `${defaultPatch}/prisma.module.ts`,
    contente: `import { Global, Module } from '@nestjs/common';
  import { PrismaService } from './prisma.service';

  /**
  * Global Prisma Module to provide the service to the entire application
  */
  @Global()
  @Module({
   providers: [PrismaService],
   exports: [PrismaService],
  })
  export class PrismaModule {}
  `,
  });

  // Installing dotenv if necessary
  logInfo("📦 Installing dotenv...");
  await runCommand(
    `${inputs.packageManager} add dotenv`,
    "❌ Failed to install dotenv"
  );

  // Creating prisma.config.ts file to load environment variables
  let prismaConfigPath = "prisma.config.ts";
  if (!fs.existsSync(prismaConfigPath)) {
    prismaConfigPath = "prisma/prisma.config.ts";
  }

  if (fs.existsSync(prismaConfigPath)) {
    logInfo(" Updating prisma.config.ts with dotenv import...");
    await updateFile({
      path: prismaConfigPath,
      pattern: /^/,
      replacement: `import 'dotenv/config';\n\n`,
    });
  }

  // Step 7: Generating the Prisma client
  await runCommand("npx prisma generate", "❌ Prisma generation failed");

  // Step 8: Migration (ONLY in 'new' mode)
  if (inputs.isDemo) {
    setupPrismaSeeding(inputs);
  }

  logSuccess(" Prisma configured successfully!");
}

/**
 * Maps generic entity types to Prisma data types.
 * @param {string} type - Generic type (e.g., 'string', 'number', 'Date', 'string[]', 'MonEnum')
 * @returns {string} The corresponding type in the Prisma schema.
 */
function mapTypeToPrisma(type) {
  // Handles the case of arrays (e.g., 'string[]')
  if (type.endsWith("[]")) {
    const innerType = type.slice(0, -2); // Removes '[]' // Recursively calls for the inner type
    return `${mapTypeToPrisma(innerType)}[]`;
  }

  const typeLower = type.toLowerCase();

  switch (typeLower) {
    case "string":
    case "text": // Mapped to String because Prisma does not have a distinct TEXT type for PostgreSQL
      return "String";

    case "number": // A simple "number" field can be Int or Float. We default to Float.
      return "Float";
    case "int":
      return "Int";

    case "decimal": // Use Decimal for high precision, or Float for simplicity
      return "Decimal";

    case "boolean":
      return "Boolean";

    case "date":
      return "DateTime";

    case "uuid": // We use String by default for storage, the @id @default(uuid()) attribute will be managed by the ID logic. // For non-ID fields, String is the appropriate choice.
      return "String";

    case "json":
      return "Json";
    case "role":
      return "Role";

    default: // Handles cases of custom enumerations (e.g., 'StatusEnum') or named object types (e.g., 'Address')
      // Prisma will use the exact type name if it matches a defined 'enum' or other 'model'.
      // In the context of a simple non-persistent DTO/object field, it is better to revert to Json if unrecognized.
      // If the type is capitalized (e.g., 'Address'), we return it as is (assuming it's another Model/Enum)
      return type.charAt(0) === type.charAt(0).toUpperCase() ? type : "Json";
  }
}

async function setupPrismaSeeding(inputs) {
  logInfo("⚙️ Configuring seeding for Prisma...");

  // --- Dependencies ---
  const prismaDevDeps = [
    "ts-node",
    "@types/node",
    "@types/bcrypt",
    "dotenv-cli",
  ];
  await runCommand(
    `${inputs.packageManager} add -D ${prismaDevDeps.join(" ")}`,
    "❌ Failed to install Prisma seeding dependencies"
  ); // Bcrypt is often a production dependency for hashing
  await runCommand(
    `${inputs.packageManager} install bcrypt`,
    "❌ Failed to install bcrypt"
  );

  // --- Scripts in package.json ---
  const prismaScripts = {
    "prisma:migrate": "prisma migrate dev",
    "prisma:seed": "prisma db seed",
    "prisma:reset": "prisma migrate reset",
    "prisma:migrate:prod": "prisma migrate deploy",
    seed: "ts-node prisma/seed.ts",
  };

  await updatePackageJson(inputs, prismaScripts);

  // --- Configuration in schema.prisma ---
  await updateFile({
    path: "prisma/schema.prisma",
    pattern: /generator client \{[^}]*\}/g,
    replacement: `generator client {
   provider = "prisma-client-js"
   output  = "../node_modules/.prisma/client"
  }

  `,
  });

  // --- Creating seed.ts file ---
  const seedTsContent = generatePrismaSeedContent(inputs.entitiesData.entities);
  await createFile({
    path: `prisma/seed.ts`,
    contente: seedTsContent,
  });

  // logSuccess("✅ Prisma seeding configured.");
}

function generatePrismaSeedContent(entities) {
  const requiresBcrypt = entities.some((e) => e.name.toLowerCase() === "user");

  return `
  import { PrismaClient } from '@prisma/client';
  ${requiresBcrypt ? "import * as bcrypt from 'bcrypt';" : ""}

  const prisma = new PrismaClient();

  async function main() {
   console.log('🌱 Starting Prisma seeding...');

   // --- 1. ADMIN USER ---
   ${
     requiresBcrypt
       ? `const salt = await bcrypt.genSalt(10);
   const hashedPassword = await bcrypt.hash('password123', salt);`
       : ""
   }

   const exists = await prisma.user.findFirst({
    where: { email: 'admin@nestcraft.com' },
  });

  if (!exists) {
    const adminUser = await prisma.user.create({
    data: {
     email: 'admin@nestcraft.com',
     ${
       requiresBcrypt
         ? "password: hashedPassword,"
         : "// Default password: password123"
     }
     username: 'NestCraftAdmin',
     role: 'SUPER_ADMIN',
     isActive: true,
    },
   });

    console.log(\`👑 Admin created: \${adminUser.email}\`);
  } else {
    console.log(\`👑 Admin realy exists: \${exists.email}\`);
  }


   // --- 2. DEMO USERS ---
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

   const existingUsers = await prisma.user.findMany({
    where: {
      email: {
        in: demoUsersData.map((u) => u.email),
      },
    },
    select: { email: true },
  });

  const existingEmails = new Set(existingUsers.map((u) => u.email));

  const usersToCreate = demoUsersData.filter(
    (u) => !existingEmails.has(u.email),
  );

  if (usersToCreate.length === 0) {
    console.log(
      '! Demo users already exist. Reset the database if you want to reseed.',
    );
  } else {
    await prisma.user.createMany({
      data: usersToCreate,
    });

    console.log(\`👥 \${usersToCreate.length} demo users created\`);
  }

   const allUsers = await prisma.user.findMany({ select: { id: true } });
   const userIds = allUsers.map(u => u.id);

   // --- 3. BLOG POSTS ---
   const postsData = [
    {
     title: 'The Basics of NestJS for Modern Developers',
     content: 'Discover how to build a robust and maintainable API with NestJS...',
     published: true,
     userId: userIds[1],
    },
    {
     title: 'How to Secure Your API with JWT',
     content: 'JWT authentication is a standard for securing APIs...',
     published: true,
     userId: userIds[2],
    },
    {
     title: 'Optimizing Node.js API Performance',
     content: 'Discover best practices for improving performance...',
     published: true,
     userId: userIds[3],
    },
    {
     title: 'Introduction to Prisma ORM',
     content: 'Prisma is a modern ORM that simplifies interactions with the database...',
     published: true,
     userId: userIds[4],
    },
    {
     title: 'Understanding Clean Architecture',
     content: 'Clean Architecture helps separate business logic from the rest of the code...',
     published: false,
     userId: userIds[0],
    },
   ];
   await prisma.post.createMany({ data: postsData, skipDuplicates: true });
   console.log('📝 5 Articles created.');

   const allPosts = await prisma.post.findMany({ select: { id: true } });
   const postIds = allPosts.map(p => p.id);

   // --- 4. DEMO COMMENTS ---
   const commentsData = [
    { content: 'Excellent article! I was able to apply these tips directly to my NestJS project.', postId: postIds[0], userId: userIds[2] },
    { content: 'Very clear and well explained, thank you for sharing about Prisma 👏', postId: postIds[3], userId: userIds[0] },
    { content: "I didn\'t know about JWT before this article, it\'s a real revelation.", postId: postIds[1], userId: userIds[4] },
    { content: 'Clean Architecture always seemed blurry to me, this article finally enlightened me.', postId: postIds[4], userId: userIds[1] },
    { content: 'Thanks for the content! I would like to see a complete tutorial with NestJS + Prisma.', postId: postIds[2], userId: userIds[3] },
   ];
   await prisma.comment.createMany({ data: commentsData, skipDuplicates: true });
   console.log('💬 5 Comments created.');

   console.log('✅ Seeding finished successfully! 🚀');
  }

  main()
   .catch((e) => {
    console.error('❌ Error during Prisma seeding:', e);
    process.exit(1);
   })
   .finally(async () => {
    await prisma.$disconnect();
   });
  `;
}

module.exports = { setupPrisma };
