const { runCommand } = require("../shell");
const path = require("path");
const {
  createFile,
  updateFile,
  createDirectory,
  capitalize,
} = require("../userInput");
const { logSuccess } = require("../loggers/logSuccess");
const { logInfo } = require("../loggers/logInfo");
const { updatePackageJson } = require("../file-utils/packageJsonUtils");

/**
 * Maps generic entity types to Mongoose schema types.
 * @param {string} type - Generic type (e.g., 'string', 'number', 'Date', 'string[]', 'MonEnum')
 * @returns {string} The corresponding Mongoose type.
 */
function mapTypeToMongoose(type) {
  // Handles the case of arrays (e.g., 'string[]')
  if (type.endsWith("[]")) {
    const innerType = type.slice(0, -2);
    const innerMapping = mapTypeToMongoose(innerType); // Recursive // Returns the type enclosed in brackets, Mongoose understands this // Note: Remove "mongoose.Schema.Types." for the array of Mixed
    return innerMapping.replace("mongoose.Schema.Types.", "") === "Mixed"
      ? "[mongoose.Schema.Types.Mixed]"
      : `[${innerMapping}]`;
  }

  const typeLower = type.toLowerCase();

  switch (typeLower) {
    case "string":
    case "text":
    case "uuid":
      return "String";

    case "number":
    case "decimal":
    case "int":
      return "Number";

    case "boolean":
      return "Boolean";

    case "date":
      return "Date";

    case "json":
    case "object": // Uses Mixed for unstructured JSON objects
      return "mongoose.Schema.Types.Mixed";

    default: // Case of a custom Enum type (e.g., 'StatusEnum')
      return "String";
  }
}

async function setupMongoose(inputs) {
  /*   logWarning(
    `Mongoose integration is currently in Beta (v0.2.x). \nSome manual import fixes and corrections might be required in the generated files.`
  ); */

  const isFull = inputs.mode === "full";

  logInfo("📦 Installing Mongoose and @nestjs/mongoose...");

  await runCommand(
    `${inputs.packageManager} install @nestjs/mongoose mongoose`,
    "Mongoose and its dependencies successfully installed!"
  );

  // --- Base Configuration (app.module.ts and .env) --- // Generating the .env file
  const envContent = `
  MONGO_URI=${inputs.dbConfig.MONGO_URI}
  MONGO_DB=${inputs.dbConfig.MONGO_DB}
   `.trim();
  await createFile({ path: ".env", contente: envContent });

  const appModulePath = path.join("src", "app.module.ts");
  const mongooseImport = `import { MongooseModule } from '@nestjs/mongoose';`;
  const mongooseForRoot = `
   MongooseModule.forRoot(process.env.MONGO_URI || "mongodb://localhost/test", {
    dbName: process.env.MONGO_DB,
   }),`;

  // 1. Adding MongooseModule import
  await updateFile({
    path: appModulePath,
    pattern: /import {[\s\S]*?} from '@nestjs\/config';/,
    replacement: (match) => `${match}\n${mongooseImport}`,
  });

  // 2. Adding MongooseModule.forRoot() configuration
  const importsPattern =
    /imports:\s*\[[\s\S]*?ConfigModule\.forRoot\([\s\S]*?\),/;
  await updateFile({
    path: appModulePath,
    pattern: importsPattern,
    replacement: (match) => `${match}${mongooseForRoot}`,
  });

  // --- Generating Mongoose Entities (Schemas) ---
  logInfo("📁 Generating Mongoose schemas (src/schemas)...");

  let forFeatureImports = [];

  for (const entity of inputs.entitiesData.entities) {
    const entityName = capitalize(entity.name);
    const entityNameLower = entity.name.toLowerCase();
    const schemaName = `${entityName}Schema`;
    const interfaceName = `${entityName}Document`;

    let fieldsContent = "";
    let extraImports = "";
    // On commence avec mongoose déjà importé pour éviter les erreurs "namespace not found"
    let mongooseImportCode =
      "import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';\nimport * as mongoose from 'mongoose';\n";

    // --- Gestion du Role (Éviter le doublon) ---
    // --- Gestion du Role (Éviter le doublon) ---
    if (entityNameLower === "user") {
      extraImports += isFull
        ? `import { Role } from 'src/user/domain/enums/role.enum';\n`
        : `import { Role } from 'src/common/enums/role.enum';\n`;

      fieldsContent += `
@Prop({ type: String, enum: Role, default: Role.USER })
role: Role;
    `;
    }

    for (const field of entity.fields) {
      // 🛡️ CORRECTION : On saute le champ s'il a déjà été traité manuellement (ex: role)
      if (entityNameLower === "user" && field.name.toLowerCase() === "role")
        continue;

      // 🛡️ CORRECTION : On évite de générer les champs de relations ici car ils sont gérés plus bas
      // Si le champ se termine par 'Id' ou s'il a le même nom qu'une entité connue
      const isRelationField = inputs.entitiesData.entities.some(
        (e) =>
          field.name.toLowerCase() === e.name.toLowerCase() ||
          field.name.toLowerCase() === e.name.toLowerCase() + "id"
      );
      if (isRelationField) continue;

      const mongooseType = mapTypeToMongoose(field.type);
      const tsType = field.type;

      const isRequired =
        field.name.toLowerCase() !== "isactive" &&
        field.name.toLowerCase() !== "password";
      const requiredOption = isRequired ? ", required: true" : "";

      // Import des enums partagés si nécessaire
      if (
        mongooseType === "String" &&
        tsType.charAt(0) === tsType.charAt(0).toUpperCase() &&
        tsType !== "Role"
      ) {
        extraImports += `import { ${tsType} } from '../shared/enums/${tsType.toLowerCase()}.enum';\n`;
      }

      fieldsContent += `
       @Prop({ type: ${mongooseType}${requiredOption} })
       ${field.name}: ${tsType};
      `;
    }

    // --- Final Generation ---
    const content = `${mongooseImportCode}${extraImports}
    export type ${interfaceName} = ${entityName} & mongoose.Document;

    @Schema({ timestamps: true })
    export class ${entityName} {
    ${fieldsContent}
    }

    export const ${schemaName} = SchemaFactory.createForClass(${entityName});
    `;

    forFeatureImports.push(
      `{ name: ${entityName}.name, schema: ${schemaName} }`
    );
  }
  // --- Final Update of app.module.ts --- //
  // 3. Adding MongooseModule.forFeature([...])
  const forFeatureBlock = `MongooseModule.forFeature([${forFeatureImports.join(
    ", "
  )}]),`;

  await updateFile({
    path: appModulePath,
    pattern: new RegExp(mongooseForRoot.trim().replace(/[\n\r]/g, "\\s*"), "g"),
    replacement: (match) => `${match}\n\t${forFeatureBlock}`,
  });

  if (inputs.isDemo) {
    // The generateSampleData function must be adapted for 'new Date()' usage and Mongoose types
    await setupMongooseSeeding(inputs);
  }

  logSuccess(
    "Mongoose configuration complete. Schemas are generated in src/schemas!"
  );
}

async function setupMongooseSeeding(inputs) {
  logInfo("⚙️ Configuring seeding for Mongoose..."); // --- Dependencies ---

  const mongooseDevDeps = ["ts-node", "@types/node", "@types/bcrypt"];
  await runCommand(
    `${inputs.packageManager} add -D ${mongooseDevDeps.join(" ")}`,
    "❌ Failed to install Mongoose seeding dependencies"
  );
  await runCommand(
    `${inputs.packageManager} install bcrypt`,
    "❌ Failed to install bcrypt"
  );

  // --- Scripts in package.json ---
  const mongooseScripts = {
    seed: "ts-node src/database/seed.ts",
  };
  await updatePackageJson(inputs, mongooseScripts);

  // --- Creating seed.ts file ---
  await createDirectory("src/database");
  const seedTsContent = await generateMongooseSeedContent(
    inputs.entitiesData.entities,
    inputs.mode
  );

  await createFile({
    path: `src/database/seed.ts`,
    contente: seedTsContent,
  });

  logSuccess("Mongoose seeding configured.");
}

async function generateMongooseSeedContent(entities, mode) {
  const hasUser = entities.some((e) => e.name.toLowerCase() === "user");
  const hasPost = entities.some((e) => e.name.toLowerCase() === "post");
  const hasComment = entities.some((e) => e.name.toLowerCase() === "comment");

  return `
import mongoose from 'mongoose';
import * as bcrypt from 'bcrypt';
import * as dotenv from 'dotenv';
dotenv.config();

${entities
  .map((e) => {
    const name = capitalize(e.name);
    const lowName = e.name.toLowerCase();
    let path;

    if (lowName === "session") {
      path =
        mode === "full"
          ? `../auth/infrastructure/persistence/mongoose/${lowName}.schema`
          : `../auth/persistence/${lowName}.schema`;
    } else {
      path =
        mode === "full"
          ? `../${lowName}/infrastructure/persistence/mongoose/${lowName}.schema`
          : `../${lowName}/entities/${lowName}.schema`;
    }

    return `import { ${name}Schema } from '${path}';`;
  })
  .join("\n")}

async function seed() {
  const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/nestcraft_db';

  try {
    await mongoose.connect(MONGO_URI);
    console.log('🌱 Starting Mongoose seeding...');

    // --- MODELS ---
    ${entities
      .map(
        (e) =>
          `const ${capitalize(e.name)}Model = mongoose.model('${capitalize(
            e.name
          )}', ${capitalize(e.name)}Schema);`
      )
      .join("\n    ")}

    // --- CLEANUP ---
    await Promise.all([${entities
      .map((e) => `${capitalize(e.name)}Model.deleteMany({})`)
      .join(", ")}]);

    // --- 1. ADMIN & DEMO USERS ---
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const users = await ${hasUser ? "UserModel" : "null"}.insertMany([
      { email: 'admin@nestcraft.com', password: hashedPassword, username: 'NestCraftAdmin', role: 'SUPER_ADMIN', isActive: true },
      { email: 'emma.jones@demo.com', password: hashedPassword, username: 'EmmaJones', isActive: true },
      { email: 'lucas.martin@demo.com', password: hashedPassword, username: 'LucasMartin', isActive: true },
      { email: 'sophia.bernard@demo.com', password: hashedPassword, username: 'SophiaBernard', isActive: true },
      { email: 'alexandre.dubois@demo.com', password: hashedPassword, username: 'AlexandreDubois', isActive: true },
      { email: 'chloe.moreau@demo.com', password: hashedPassword, username: 'ChloeMoreau', isActive: true },
    ]);
    console.log(\`👥 \${users.length} users created\`);

    ${
      hasPost
        ? `
    // --- 2. BLOG POSTS ---
    const posts = await PostModel.insertMany([
      {
        title: 'The Basics of NestJS for Modern Developers',
        content: 'Discover how to build a robust and maintainable API with NestJS...',
        published: true,
        userId: users[1]._id,
      },
      {
        title: 'How to Secure Your API with JWT',
        content: 'JWT authentication is a standard for securing APIs...',
        published: true,
        userId: users[2]._id,
      },
      {
        title: 'Optimizing Node.js API Performance',
        content: 'Discover best practices for improving performance...',
        published: true,
        userId: users[3]._id,
      },
      {
        title: 'Introduction to Prisma ORM',
        content: 'Prisma is a modern ORM that simplifies interactions with the database...',
        published: true,
        userId: users[4]._id,
      },
      {
        title: 'Understanding Clean Architecture',
        content: 'Clean Architecture helps separate business logic from the rest of the code...',
        published: false,
        userId: users[0]._id,
      },
    ]);
    console.log('📝 5 Articles created');
    `
        : ""
    }

    ${
      hasComment && hasPost
        ? `
    // --- 3. DEMO COMMENTS ---
    await CommentModel.insertMany([
      { content: 'Excellent article! I was able to apply these tips directly to my NestJS project.', postId: posts[0]._id, userId: users[2]._id },
      { content: 'Very clear and well explained, thank you for sharing about Prisma 👏', postId: posts[3]._id, userId: users[0]._id },
      { content: "I didn't know about JWT before this article, it's a real revelation.", postId: posts[1]._id, userId: users[4]._id },
      { content: 'Clean Architecture always seemed blurry to me, this article finally enlightened me.', postId: posts[4]._id, userId: users[1]._id },
      { content: 'Thanks for the content! I would like to see a complete tutorial with NestJS + Prisma.', postId: posts[2]._id, userId: users[3]._id },
    ]);
    console.log('💬 5 Comments created');
    `
        : ""
    }

    console.log('✅ Mongoose seeding finished successfully! 🚀');
  } catch (err) {
    console.error('❌ Seeding error:', err);
  } finally {
    await mongoose.disconnect();
  }
}

seed();
`;
}

module.exports = { setupMongoose };
