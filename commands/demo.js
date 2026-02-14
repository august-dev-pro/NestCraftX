const inquirer = require("inquirer");
const { logInfo } = require("../utils/loggers/logInfo");
const { logSuccess } = require("../utils/loggers/logSuccess");
const { createProject } = require("../utils/setups/projectSetup");
const {
  setupCleanArchitecture,
} = require("../utils/configs/setupCleanArchitecture");
const {
  setupLightArchitecture,
} = require("../utils/configs/setupLightArchitecture");
const { setupAuth } = require("../utils/setups/setupAuth");
const { setupSwagger } = require("../utils/setups/setupSwagger");
const { setupDatabase } = require("../utils/setups/setupDatabase");
const { configureDocker } = require("../utils/configs/configureDocker");
const { generateEnvFile, writeEnvFile } = require("../utils/envGenerator");
const { setupBootstrapLogger } = require("../utils/setups/setupLogger");
const { saveProjectConfig } = require("../utils/file-utils/saveProjectConfig");
const actualInquirer = inquirer.default || inquirer;

async function demoCommand(flags = {}) {
  console.log("\n🎯 Generating demonstration project...\n");
  logInfo('Configuring "blog-demo" project');

  // Prépare les questions à poser uniquement si le flag n'est pas passé
  const questions = [];
  if (flags.light === undefined) {
    questions.push({
      type: "confirm",
      name: "light",
      message: "LIGHT Mode (Simplified MVP)?",
      default: false,
    });
  }
  if (flags.docker === undefined) {
    questions.push({
      type: "confirm",
      name: "docker",
      message: "Enable Docker?",
      default: true,
    });
  }
  if (flags.auth === undefined) {
    questions.push({
      type: "confirm",
      name: "auth",
      message: "Enable JWT Auth?",
      default: true,
    });
  }
  if (flags.swagger === undefined) {
    questions.push({
      type: "confirm",
      name: "swagger",
      message: "Enable Swagger UI?",
      default: true,
    });
  }
  if (flags.orm === undefined) {
    questions.push({
      type: "list",
      name: "orm",
      message: "Choose ORM / Database?",
      choices: [
        { name: "Prisma (PostgreSQL)", value: "prisma" },
        { name: "TypeORM (PostgreSQL)", value: "typeorm" },
        { name: "Mongoose (MongoDB)", value: "mongoose" },
      ],
      default: "prisma",
    });
  }

  if (flags.packageManager === undefined) {
    questions.push({
      type: "list",
      name: "packageManager",
      message: "Choose the package manager for the project?",
      choices: [
        { name: "npm", value: "npm" },
        { name: "yarn", value: "yarn" },
        { name: "pnpm", value: "pnpm" },
      ],
      default: "npm",
    });
  }

  // Pose uniquement les questions nécessaires
  const answers =
    questions.length > 0 ? await actualInquirer.prompt(questions) : {};

  // Fusionne les réponses interactives et les flags (flags prioritaire)
  const options = { ...answers, ...flags };
  const packageManager = options.packageManager || "npm";
  const isLight = !!options.light;
  const useDocker = !!options.docker;
  const useAuth = !!options.auth;
  const useSwagger = !!options.swagger;
  const orm = options.orm || "prisma";

  let selectedDB = "postgresql";
  let dbConfig = {};

  if (orm === "prisma") {
    selectedDB = "postgresql";
    dbConfig = {
      orm: "prisma",
      POSTGRES_USER: "postgres",
      POSTGRES_PASSWORD: "postgres",
      POSTGRES_DB: "blog_demo",
      POSTGRES_HOST: "localhost",
      POSTGRES_PORT: "5432",
    };
  } else if (orm === "typeorm") {
    selectedDB = "postgresql";
    dbConfig = {
      orm: "typeorm",
      POSTGRES_USER: "postgres",
      POSTGRES_PASSWORD: "postgres",
      POSTGRES_DB: "blog_demo",
      POSTGRES_HOST: "localhost",
      POSTGRES_PORT: "5432",
    };
  } else if (orm === "mongoose") {
    selectedDB = "mongodb";
    dbConfig = {
      orm: "mongoose",
      MONGO_URI: "mongodb://localhost:27017/blog_demo",
      MONGO_DB: "blog_demo",
      MONGO_HOST: "localhost",
      MONGO_PORT: "27017",
    };
  }

  let entitiesData = { entities: [], relations: [] };

  entitiesData = {
    entities: [
      {
        name: "user",
        fields: [
          { name: "email", type: "string" },
          { name: "password", type: "string" },
          { name: "username", type: "string" },
          { name: "role", type: "Role" },
          { name: "isActive", type: "boolean" },
        ],
      },
      {
        name: "post",
        fields: [
          { name: "title", type: "string" },
          { name: "content", type: "string" },
          { name: "published", type: "boolean" },
          { name: "userId", type: "string" },
        ],
      },
      {
        name: "comment",
        fields: [
          { name: "content", type: "string" },
          { name: "postId", type: "string" },
          { name: "userId", type: "string" },
        ],
      },
    ],
    relations: [
      { from: "user", to: "post", type: "1-n" },
      { from: "post", to: "comment", type: "1-n" },
      { from: "user", to: "comment", type: "1-n" },
    ],
  };

  if (useAuth) {
    // 1. Entité Session
    entitiesData.entities.push({
      name: "session",
      fields: [
        { name: "refreshToken", type: "string" },
        { name: "userId", type: "string" },
        { name: "expiresAt", type: "Date" },
        { name: "createdAt", type: "Date", default: "now" },
      ],
    });

    // 3. relation user & session
    entitiesData.relations.push({
      from: "user",
      to: "session",
      type: "1-n",
    });
  }

  const demoInputs = {
    projectName: "blog-demo",
    useDocker,
    useAuth,
    useSwagger,
    swaggerInputs: {
      title: "Blog Demo API",
      description:
        "Demonstration API created with NestCraftX - Blog management with users and posts",
      version: "1.0.0",
      endpoint: "api/docs",
    },
    packageManager: packageManager,
    mode: isLight ? "light" : "full",
    isDemo: true,
    entitiesData: entitiesData,
    selectedDB,
    dbConfig,
  };

  await createProject(demoInputs);

  if (isLight) {
    await setupLightArchitecture(demoInputs);
  } else {
    await setupCleanArchitecture(demoInputs);
  }

  if (useAuth) {
    await setupAuth(demoInputs);
  }

  if (useSwagger) {
    await setupSwagger(demoInputs.swaggerInputs);
  } else {
    await setupBootstrapLogger();
  }

  if (useDocker) {
    await configureDocker(demoInputs);
  }

  await setupDatabase(demoInputs);

  const envContent = await generateEnvFile(demoInputs);
  writeEnvFile(envContent);

  await saveProjectConfig(demoInputs);

  console.log("\n" + "=".repeat(60));
  logSuccess("Demonstration project created successfully!");
  console.log("=".repeat(60));

  console.log('\nProject "blog-demo" configured with:');
  console.log("  ✅ 3 Entities: User, Post, Comment");
  console.log("  ✅ Entity Relationships");
  if (useAuth) console.log("  ✅ Integrated JWT Auth");
  if (useSwagger) console.log("  ✅ Swagger UI enabled");
  if (useDocker) console.log("  ✅ Docker & Docker Compose");
  console.log(
    orm === "prisma"
      ? "  ✅ Prisma ORM (PostgreSQL) configured"
      : orm === "typeorm"
        ? "  ✅ TypeORM (PostgreSQL) configured"
        : "  ✅ Mongoose (MongoDB) configured",
  );
  console.log(
    isLight
      ? "  ✅ LIGHT Structure (Simplified MVP)"
      : "  ✅ Complete Clean Architecture",
  );

  console.log("\n🚀 To get started:");
  console.log(" 1- cd blog-demo");

  // Instructions spécifiques selon le moteur choisi
  const pm = demoInputs.packageManager;
  const run = pm === "yarn" ? "" : "run "; // yarn n'a pas besoin de 'run'
  if (orm === "prisma" || orm === "typeorm") {
    console.log(
      "\n  2- Create a PostgreSQL database with the name specified in the .env (default 'blog_demo').",
    );
    console.log("    Example (psql) : createdb blog_demo");
    console.log(
      "\n  3- Open the generated .env file and replace the values with your actual connection details:",
    );
    console.log("   POSTGRES_USER=<your_user>");
    console.log("   POSTGRES_PASSWORD=<your_password>");
    console.log("   POSTGRES_DB=blog_demo");
    console.log("   POSTGRES_HOST=localhost");
    console.log("   POSTGRES_PORT=5432");
    console.log("\n  4- Run migrations and seeds:");
    if (orm === "prisma") {
      console.log(`   npx prisma migrate reset`);
      console.log(`   npx prisma migrate dev`);
      console.log(`   npx prisma db seed`);
    } else {
      console.log(`   ${pm} ${run}typeorm:migration:run`);
      console.log(`   ${pm} ${run}typeorm:seed`);
    }
  } else if (orm === "mongoose") {
    console.log("\n  2- MongoDB: You can use either a local server or Docker.");
    console.log(
      "    By default, the project uses: MONGO_URI=mongodb://localhost:27017/blog_demo",
    );
    console.log(
      "    The database will be created automatically upon first write operation.",
    );
    console.log(
      "\n  3- Open the generated .env file and replace the MONGO_URI variable if necessary:",
    );
    console.log(
      "     MONGO_URI=mongodb://<user>:<password>@localhost:27017/blog_demo",
    );
    console.log("\n  4- Run the seed script (if present):");
    console.log(`   ${pm} ${run}seed`);
  }

  console.log("\n  5- Run the project:");
  console.log(`     ${demoInputs.packageManager} run start:dev`);
  if (useSwagger)
    console.log("  6- Open Swagger UI : http://localhost:3000/api/docs");

  console.log("\n📚 Main Endpoints:");
  if (useAuth) {
    console.log("  • /auth/register  → Create an account");
    console.log("  • /auth/login    → Log in");
  }
  console.log("  • /users      → Manage users");
  console.log("  • /posts      → Manage posts");
  console.log("  • /comments     → Manage comments");

  console.log("\n💡 Tip:");
  console.log(
    "  Modify the .env file to connect your own database (Postgres or Mongo).",
  );
  console.log(
    "  Once configured and migrated/seeded, the project is ready to run immediately! 🚀\n",
  );
}

module.exports = demoCommand;
