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

/* async function setupMongoose(inputs) {
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
} */

// The utility function for mapping is necessary for setupMongoose
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
  await createDirectory("src/schemas"); // This variable will store MongooseModule.forFeature imports for app.module.ts

  let forFeatureImports = [];

  for (const entity of inputs.entitiesData.entities) {
    const entityName = capitalize(entity.name);
    const entityNameLower = entity.name.toLowerCase();
    const schemaName = `${entityName}Schema`;
    const interfaceName = `${entityName}Document`;

    let fieldsContent = "";
    let extraImports = "";
    let mongooseImportCode =
      "import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';\n"; // Conditional addition of import * as mongoose

    if (
      entity.fields.some(
        (f) => mapTypeToMongoose(f.type) === "mongoose.Schema.Types.Mixed"
      )
    ) {
      mongooseImportCode += "import * as mongoose from 'mongoose';\n";
    }

    // --- Base Data Fields --- // Adding the role field if it's the User entity (assuming a Role enum exists)
    if (entityNameLower === "user") {
      extraImports += `import { Role } from 'src/user/domain/enums/role.enum';\n`;
      fieldsContent += `
   @Prop({ type: String, enum: Role, default: Role.USER })
   role: Role;
  `;
    }

    for (const field of entity.fields) {
      // We ignore fields if we know they are relationships
      // (Exclusion logic should be done, but here we simplify Mongoose)

      const mongooseType = mapTypeToMongoose(field.type);
      const tsType = field.type; // We use the DTO type directly (string, number, Date, MonEnum, T[]) // 'id', 'createdAt', 'updatedAt' fields are managed by Mongoose (@Schema({timestamps: true})) // Simplified 'required' logic

      const isRequired =
        field.name.toLowerCase() !== "isactive" &&
        field.name.toLowerCase() !== "password";
      const requiredOption = isRequired ? ", required: true" : ""; // If the type is an enum, add the import

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
    } // --- Mongoose Relations (References) ---

    for (const relation of inputs.entitiesData.relations) {
      const relFrom = relation.from;
      const relTo = relation.to; // If the current entity must have a reference (foreign key)

      if (relTo.toLowerCase() === entityNameLower) {
        const targetEntity = capitalize(relFrom);
        mongooseImportCode += "import * as mongoose from 'mongoose';\n";
        extraImports += `import { ${targetEntity} } from './${targetEntity}.schema';\n`; // 1-n or 1-1 : unique reference

        if (
          relation.type === "1-n" ||
          relation.type === "1-1" ||
          relation.type === "n-1"
        ) {
          const fkName = `${relFrom.toLowerCase()}Id`;
          fieldsContent += `
   // Reference to the ${targetEntity} entity
   @Prop({ type: mongoose.Schema.Types.ObjectId, ref: '${targetEntity}' })
   ${fkName}: ${targetEntity};
  `;
        } // n-n : array reference (non-standard Mongoose, but common)
        else if (relation.type === "n-n") {
          const collectionName = `${relFrom.toLowerCase()}s`;
          fieldsContent += `
   // Multiple references to the ${targetEntity} entity
   @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: '${targetEntity}' }] })
   ${collectionName}: ${targetEntity}[];
  `;
        }
      }
    } // --- Final Generation of Schemas/Documents File ---

    const content = `${mongooseImportCode}
  ${extraImports}

  export type ${interfaceName} = ${entityName} & mongoose.Document;

  @Schema({ timestamps: true })
  export class ${entityName} {
   // Mongoose handles the ID (_id: ObjectId)
  ${fieldsContent}
  }

  export const ${schemaName} = SchemaFactory.createForClass(${entityName});
  `;

    await createFile({
      path: `src/schemas/${entityName}.schema.ts`,
      contente: content,
    }); // Storing import information for app.module.ts

    forFeatureImports.push(
      `{ name: ${entityName}.name, schema: ${schemaName} }`
    );
  } // --- Final Update of app.module.ts --- // 3. Adding entity (schema) imports at the beginning of app.module.ts

  const schemaImports = inputs.entitiesData.entities
    .map((entity) => {
      const entityName = capitalize(entity.name);
      const schemaName = `${entityName}Schema`;
      return `import { ${entityName}, ${schemaName} } from './schemas/${entityName}.schema';`;
    })
    .join("\n");

  await updateFile({
    path: appModulePath,
    pattern: new RegExp(mongooseImport, "g"), // Targets the existing Mongoose import
    replacement: (match) => `${match}\n${schemaImports}`,
  }); // 4. Adding MongooseModule.forFeature([...])

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
  ); // --- Scripts in package.json ---

  const mongooseScripts = {
    seed: "ts-node src/database/seed.ts",
  };
  await updatePackageJson(inputs, mongooseScripts); // --- Creating seed.ts file ---

  await createDirectory("src/database");
  const seedTsContent = generateMongooseSeedContent(
    inputs.entitiesData.entities
  );

  await createFile({
    path: `src/database/seed.ts`,
    contente: seedTsContent,
  });

  logSuccess("Mongoose seeding configured.");
}

function generateMongooseSeedContent(entities) {
  return `/**
  * 🚀 Mongoose Seeding Script
  * Automatically generated by NestCraftX
  * ------------------------------------
  * This script inserts sample data into the MongoDB database.
  * Command: npm run seed
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
   console.log('✅ Connected to MongoDB');
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
    console.log('✅ ${entity.name} data inserted');
    `;
    })
    .join("\n")}

    console.log('🎉 Seeding finished successfully.');
    await mongoose.disconnect();
   } catch (err) {
    console.error('❌ Error during seeding:', err);
    process.exit(1);
   }
  }

  seed();
  `;
}

/**
 * Generates sample data for each entity, handling advanced types.
 */
function generateSampleData(entity) {
  const fields = entity.fields || [];
  const sampleObj = fields
    .map((f) => {
      // For 'string[]', 'number[]', 'Date[]', etc. types
      if (f.type.endsWith("[]")) {
        const baseType = f.type.slice(0, -2);
        if (baseType === "string" || baseType === "text")
          return `${f.name}: ['${f.name}_item_1', '${f.name}_item_2']`;
        if (baseType === "number" || baseType === "decimal")
          return `${f.name}: [10, 20]`;
        if (baseType === "Date") return `${f.name}: [new Date(), new Date()]`;
        return `${f.name}: []`;
      }

      if (f.name.toLowerCase().includes("password")) {
        return `${f.name}: await bcrypt.hash('password123', 10)`;
      }
      if (["string", "text", "uuid"].includes(f.type.toLowerCase()))
        return `${f.name}: '${f.name}_example'`;
      if (["number", "decimal", "int"].includes(f.type.toLowerCase()))
        return `${f.name}: ${Math.floor(Math.random() * 100)}`;
      if (f.type === "boolean") return `${f.name}: true`;
      if (f.type === "date") return `${f.name}: new Date()`;
      if (["json", "object"].includes(f.type.toLowerCase()))
        return `${f.name}: { key: 'value', count: 42 }`;

      return `${f.name}: null`;
    })
    .join(",\n   ");

  return `{ ${sampleObj} }`;
}

module.exports = { setupMongoose };
