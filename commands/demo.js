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
const actualInquirer = inquirer.default || inquirer;

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
      message: "Choisir le gestionnaire de paquets pour le projet ?",
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
    packageManager: packageManager,
    mode: isLight ? "light" : "full",
    isDemo: true,
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
      ? "   ✅ Prisma ORM (PostgreSQL) configuré"
      : orm === "typeorm"
      ? "   ✅ TypeORM (PostgreSQL) configuré"
      : "   ✅ Mongoose (MongoDB) configuré"
  );
  console.log(
    isLight
      ? "   ✅ Structure LIGHT (MVP simplifiée)"
      : "   ✅ Clean Architecture complète"
  );

  console.log("\n🚀 Pour démarrer:");
  console.log("   1️⃣ cd blog-demo");
  // Instructions spécifiques selon le moteur choisi
  if (orm === "prisma" || orm === "typeorm") {
    console.log(
      "\n   2️⃣ Créez une base PostgreSQL avec le nom indiqué dans le .env (par défaut 'blog_demo')."
    );
    console.log("       Exemple (psql) :");
    console.log("          createdb blog_demo");
    console.log(
      "\n   3️⃣ Ouvrez le fichier .env généré et remplacez les valeurs par vos vraies informations :"
    );
    console.log("          POSTGRES_USER=<votre_user>");
    console.log("          POSTGRES_PASSWORD=<votre_mot_de_passe>");
    console.log("          POSTGRES_DB=blog_demo");
    console.log("          POSTGRES_HOST=localhost");
    console.log("          POSTGRES_PORT=5432");
    console.log("\n   4️⃣ Exécutez les migrations et les seeds :");
    if (orm === "prisma") {
      console.log("          npx prisma migrate dev");
      console.log("          npx prisma db seed");
    } else {
      console.log(
        `          ${demoInputs.packageManager} run typeorm:migration:run`
      );
      console.log(`          ${demoInputs.packageManager} run typeorm:seed`); // si tu as un script seed
    }
  } else if (orm === "mongoose") {
    console.log(
      "\n   2️⃣ MongoDB : tu peux soit utiliser un serveur local, soit Docker."
    );
    console.log(
      "       Par défaut, le projet utilise : MONGO_URI=mongodb://localhost:27017/blog_demo"
    );
    console.log(
      "       La base sera créée automatiquement lors du premier écriture."
    );
    console.log(
      "\n   3️⃣ Ouvrez le fichier .env généré et remplacez la variable MONGO_URI si nécessaire :"
    );
    console.log(
      "          MONGO_URI=mongodb://<user>:<password>@localhost:27017/blog_demo"
    );
    console.log("\n   4️⃣ Exécutez le script de seed (si présent) :");
    console.log(`          ${demoInputs.packageManager} run seed`);
  }

  console.log("\n   5️⃣ Lancez le projet :");
  console.log(`          ${demoInputs.packageManager} run start:dev`);
  if (useSwagger)
    console.log("   6️⃣ Ouvrez Swagger UI : http://localhost:3000/api/docs");

  console.log("\n📚 Endpoints principaux :");
  if (useAuth) {
    console.log("   • /auth/register    → Créer un compte");
    console.log("   • /auth/login       → Se connecter");
  }
  console.log("   • /users            → Gérer les utilisateurs");
  console.log("   • /posts            → Gérer les articles");
  console.log("   • /comments         → Gérer les commentaires");

  console.log("\n💡 Astuce :");
  console.log(
    "   Modifiez le fichier .env pour connecter votre propre base (Postgres ou Mongo)."
  );
  console.log(
    "   Une fois configurée et migrée/seedée, le projet est prêt à être lancé immédiatement ! 🚀\n"
  );
}

module.exports = demoCommand;
