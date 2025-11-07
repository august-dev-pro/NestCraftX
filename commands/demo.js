const inquirer = require("inquirer");
const { logInfo } = require("../utils/loggers/logInfo");
const { logSuccess } = require("../utils/loggers/logSuccess");

async function demoCommand(flags = {}) {
  console.log("\n🎯 Génération du projet de démonstration...\n");
  logInfo('Configuration du projet "blog-demo"');

  // Prépare les questions à poser uniquement si le flag n'est pas passé
  const questions = [];
  if (flags.light === undefined) {
    questions.push({
      type: "confirm",
      name: "light",
      message: "Mode LIGHT (MVP simplifié) ?",
      default: false,
    });
  }
  if (flags.docker === undefined) {
    questions.push({
      type: "confirm",
      name: "docker",
      message: "Activer Docker ?",
      default: true,
    });
  }
  if (flags.auth === undefined) {
    questions.push({
      type: "confirm",
      name: "auth",
      message: "Activer Auth JWT ?",
      default: true,
    });
  }
  if (flags.swagger === undefined) {
    questions.push({
      type: "confirm",
      name: "swagger",
      message: "Activer Swagger UI ?",
      default: true,
    });
  }
  if (flags.orm === undefined) {
    questions.push({
      type: "list",
      name: "orm",
      message: "Choisir l'ORM / Base de données ?",
      choices: [
        { name: "Prisma (PostgreSQL)", value: "prisma" },
        { name: "TypeORM (MySQL)", value: "typeorm" },
        { name: "Mongoose (MongoDB)", value: "mongoose" },
      ],
      default: "prisma",
    });
  }

  // Pose uniquement les questions nécessaires
  const answers = questions.length > 0 ? await inquirer.prompt(questions) : {};

  // Fusionne les réponses interactives et les flags (flags prioritaire)
  const options = { ...answers, ...flags };

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
    selectedDB = "mysql";
    dbConfig = {
      orm: "typeorm",
      MYSQL_USER: "root",
      MYSQL_PASSWORD: "root",
      MYSQL_DB: "blog_demo",
      MYSQL_HOST: "localhost",
      MYSQL_PORT: "3306",
    };
  } else if (orm === "mongoose") {
    selectedDB = "mongodb";
    dbConfig = {
      orm: "mongoose",
      MONGO_INITDB_DATABASE: "blog_demo",
      MONGO_HOST: "localhost",
      MONGO_PORT: "27017",
    };
  }

  const demoInputs = {
    projectName: "blog-demo",
    useYarn: false,
    useDocker,
    useAuth,
    useSwagger,
    swaggerInputs: {
      title: "Blog Demo API",
      description:
        "API de démonstration créée avec NestCraftX - Gestion de blog avec utilisateurs et posts",
      version: "1.0.0",
      endpoint: "api/docs",
    },
    packageManager: "npm",
    mode: isLight ? "light" : "full",
    entitiesData: {
      entities: [
        {
          name: "user",
          fields: [
            { name: "email", type: "string" },
            { name: "password", type: "string" },
            { name: "username", type: "string" },
            { name: "isActive", type: "boolean" },
          ],
        },
        {
          name: "post",
          fields: [
            { name: "title", type: "string" },
            { name: "content", type: "string" },
            { name: "published", type: "boolean" },
            { name: "authorId", type: "string" },
          ],
        },
        {
          name: "comment",
          fields: [
            { name: "content", type: "string" },
            { name: "postId", type: "string" },
            { name: "authorId", type: "string" },
          ],
        },
      ],
      relations: [
        { from: "post", to: "user", type: "1-n" },
        { from: "comment", to: "post", type: "1-n" },
        { from: "comment", to: "user", type: "1-n" },
      ],
    },
    selectedDB,
    dbConfig,
  };

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
  }
  if (useDocker) {
    await configureDocker(demoInputs);
  }
  await setupDatabase(demoInputs);

  console.log("\n" + "=".repeat(60));
  logSuccess("✨ Projet de démonstration créé avec succès!");
  console.log("=".repeat(60));

  console.log('\n📊 Projet "blog-demo" configuré avec:');
  console.log("   ✅ 3 Entités: User, Post, Comment");
  console.log("   ✅ Relations entre entités");
  if (useAuth) console.log("   ✅ Auth JWT intégrée");
  if (useSwagger) console.log("   ✅ Swagger UI activé");
  if (useDocker) console.log("   ✅ Docker & Docker Compose");
  console.log(
    orm === "prisma"
      ? "   ✅ Prisma ORM configuré"
      : orm === "typeorm"
      ? "   ✅ TypeORM configuré"
      : "   ✅ Mongoose configuré"
  );
  console.log(
    isLight
      ? "   ✅ Structure LIGHT (MVP simplifiée)"
      : "   ✅ Clean Architecture complète"
  );

  console.log("\n🚀 Pour démarrer:");
  console.log("   1. cd blog-demo");
  console.log("   2. npm run start:dev");
  if (useSwagger) console.log("   3. Ouvrir http://localhost:3000/api/docs");

  console.log("\n📚 Endpoints disponibles:");
  if (useAuth) {
    console.log("   • /auth/register    - Créer un compte");
    console.log("   • /auth/login       - Se connecter");
  }
  console.log("   • /users            - Gérer les utilisateurs");
  console.log("   • /posts            - Gérer les posts");
  console.log("   • /comments         - Gérer les commentaires");

  console.log("\n💡 Astuce:");
  console.log("   Ce projet démo est prêt à l'emploi et montre toutes");
  console.log("   les capacités de NestCraftX. Parfait pour comprendre");
  console.log(
    isLight
      ? "   la structure LIGHT et commencer rapidement!\n"
      : "   la Clean Architecture et commencer rapidement!\n"
  );
}

module.exports = demoCommand;
