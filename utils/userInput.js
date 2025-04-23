import * as readline from "readline-sync";
import * as fs from "fs";

/* export async function getUserInputs() {
  console.log("\n🔹🔹🔹 Configuration du projet 🔹🔹🔹");

  // Collecte des inputs principaux
  const projectName = readline.question("Nom du projet: ");
  const databaseName = readline.question("Nom de la base de données: ");
  const dbUser = readline.question(
    "Nom d’utilisateur PostgreSQL [postgres]: ",
    {
      defaultInput: "postgres",
    }
  );
  const dbPassword = readline.question("Mot de passe PostgreSQL: ", {
    hideEchoBack: true,
  });
  const useYarn = readline.question("Voulez-vous utiliser npm ou Yarn ?: ", {
    defaultInput: "npm",
  });
  const useDocker = readline.keyInYNStrict(
    "Voulez-vous générer un fichier Docker?"
  );
  const useAuth = readline.keyInYNStrict(
    "Voulez-vous ajouter une authentification JWT?"
  );

  const entities = readline
    .question("Noms des entités (séparés par une virgule): ")
    .split(",")
    .map((e) => e.trim());

  const packageManager = readline.keyInYNStrict("Utiliser Yarn?")
    ? "yarn"
    : "npm";

  const useSwagger = readline.keyInYNStrict("Voulez-vous installer Swagger?");

  let swaggerInputs;

  // Récupération des inputs Swagger si l'utilisateur souhaite l'installer
  if (useSwagger) {
    swaggerInputs = getUserInputsSwagger();
  }

  // Retourne tous les inputs utilisateur
  return {
    projectName,
    databaseName,
    dbUser,
    dbPassword,
    useYarn,
    useDocker,
    useAuth,
    useSwagger,
    swaggerInputs,
    entities,
    packageManager,
  };
} */

export async function getUserInputs2() {
  console.log("\n🔹🔹🔹 Configuration du projet 🔹🔹🔹");

  const dataBases = [
    {
      name: "postgresql",
      label: "PostgreSQL",
      ormOptions: ["prisma", "typeorm"], // Choix des ORM supportés
      required: [
        {
          title: "Nom d’utilisateur PostgreSQL",
          envVar: "POSTGRES_USER",
          defaultValue: "postgres",
          hideEchoBack: false,
        },
        {
          title: "Mot de passe PostgreSQL",
          envVar: "POSTGRES_PASSWORD",
          defaultValue: null,
          hideEchoBack: true,
        },
        {
          title: "Nom de la base de données",
          envVar: "POSTGRES_DB",
          defaultValue: "mydb",
          hideEchoBack: false,
        },
        {
          title: "Hôte PostgreSQL",
          envVar: "POSTGRES_HOST",
          defaultValue: "localhost",
          hideEchoBack: false,
        },
        {
          title: "Port PostgreSQL",
          envVar: "POSTGRES_PORT",
          defaultValue: "5432",
          hideEchoBack: false,
        },
      ],
    },
    /* {
      name: "mysql",
      label: "MySQL / MariaDB",
      ormOptions: ["prisma", "typeorm"], // Choix des ORM supportés
      required: [
        {
          title: "Nom d’utilisateur MySQL",
          envVar: "MYSQL_USER",
          defaultValue: "root",
          hideEchoBack: false,
        },
        {
          title: "Mot de passe MySQL",
          envVar: "MYSQL_PASSWORD",
          defaultValue: null,
          hideEchoBack: true,
        },
        {
          title: "Nom de la base de données",
          envVar: "MYSQL_DB",
          defaultValue: "mydb",
          hideEchoBack: false,
        },
        {
          title: "Hôte MySQL",
          envVar: "MYSQL_HOST",
          defaultValue: "localhost",
          hideEchoBack: false,
        },
        {
          title: "Port MySQL",
          envVar: "MYSQL_PORT",
          defaultValue: "3306",
          hideEchoBack: false,
        },
      ],
    },
    {
      name: "mongodb",
      label: "MongoDB",
      ormOptions: ["mongoose"], // Choix d'ORM pour MongoDB
      required: [
        {
          title: "URL de connexion MongoDB",
          envVar: "MONGO_URI",
          defaultValue: "mongodb://localhost:27017",
          hideEchoBack: false,
        },
        {
          title: "Nom de la base de données",
          envVar: "MONGO_DB",
          defaultValue: "mydb",
          hideEchoBack: false,
        },
      ],
    },
    {
      name: "sqlite",
      label: "SQLite",
      ormOptions: ["prisma", "sequelize"], // Choix des ORM supportés
      required: [
        {
          title: "Chemin du fichier SQLite",
          envVar: "SQLITE_PATH",
          defaultValue: "./data/sqlite.db",
          hideEchoBack: false,
        },
      ],
    },
    {
      name: "firebase",
      label: "Firebase Firestore",
      ormOptions: ["firebase"], // Firebase n'a pas d'ORM traditionnel
      required: [
        {
          title: "Chemin vers le fichier de configuration Firebase (JSON)",
          envVar: "FIREBASE_CONFIG_PATH",
          defaultValue: "./firebase-config.json",
          hideEchoBack: false,
        },
      ],
    },
    {
      name: "redis",
      label: "Redis",
      ormOptions: ["redis"], // Redis n'a pas d'ORM traditionnel
      required: [
        {
          title: "URL de connexion Redis",
          envVar: "REDIS_URL",
          defaultValue: "redis://localhost:6379",
          hideEchoBack: false,
        },
      ],
    }, */
  ];

  const projectName = readline.question("Nom du projet: ");
  // const databaseName = readline.question("Nom de la base de données: ");

  let usedDB = readline.question(
    `Quelle base de donnée voulez-vous utiliser ? (${dataBases
      .map((db) => db.name)
      .join(", ")}) : `,
    { defaultInput: "postgresql" }
  );

  let selectedDB = dataBases.find(
    (db) => db.name.toLowerCase() === usedDB.toLowerCase()
  );

  while (!selectedDB) {
    console.log("❌ Base de données non reconnue.");

    usedDB = readline.question(
      `Quelle base de donnée voulez-vous utiliser ? (${dataBases
        .map((db) => db.name)
        .join(", ")}) : `
    );

    selectedDB = dataBases.find(
      (db) => db.name.toLowerCase() === usedDB.toLowerCase()
    );
  }

  const dbConfig = {};

  // Configuration de la base de données (champ utilisateur)
  selectedDB.required.forEach((field) => {
    const answer = readline.question(
      `${field.title} (par défaut: ${field.defaultValue}) : `,
      { hideEchoBack: field.hideEchoBack }
    );
    dbConfig[field.envVar] = answer || field.defaultValue;
  });

  // Ajout du choix de l'ORM dans la configuration
  if (selectedDB.ormOptions && selectedDB.ormOptions.length > 0) {
    const ormChoice = readline.question(
      `Choisissez un ORM pour ${selectedDB.label} (${selectedDB.ormOptions.join(
        ", "
      )}): `
    );
    dbConfig.orm = ormChoice || selectedDB.ormOptions[0]; // Par défaut, choisir le premier ORM
  }

  /* const dbUser = readline.question(
    "Nom d’utilisateur PostgreSQL [postgres]: ",
    {
      defaultInput: "postgres",
    }
  );
  const dbPassword = readline.question("Mot de passe PostgreSQL: ", {
    hideEchoBack: true,
  }); */

  const useYarn = readline.keyInYNStrict("Utiliser Yarn ?");
  const useDocker = readline.keyInYNStrict(
    "Voulez-vous générer un fichier Docker?"
  );
  const useAuth = readline.keyInYNStrict(
    "Voulez-vous ajouter une authentification JWT?"
  );
  const useSwagger = readline.keyInYNStrict("Voulez-vous installer Swagger?");
  const packageManager = useYarn ? "yarn" : "npm";

  // 🧱 Saisie des entités et champs
  const entitiesData = {
    entities: [],
    relations: [],
  };

  if (useAuth) {
    console.log("🔐 Auth activé : ajout automatique de l'entité 'User'");

    entitiesData.entities.push({
      name: "user",
      fields: [
        { name: "email", type: "string" },
        { name: "password", type: "string" },
        { name: "isActive", type: "boolean" },
      ],
    });
  }

  const nbEntities = parseInt(
    readline.question(
      "Combien d'entités veux-tu créer (sans compter le user) ? "
    ),
    10
  );

  for (let i = 0; i < nbEntities; i++) {
    const name = readline.question(`Nom de l'entité #${i + 1} : `);
    const fields = [];

    while (true) {
      const fname = readline.question(
        `  ➤ Nom du champ (vide pour terminer) : `
      );
      if (!fname) break;

      const ftype = readline.question(
        `    Type du champ "${fname}" (ex: string, number, boolean, Date, enum, etc.) : `
      );

      fields.push({ name: fname, type: ftype });
    }

    entitiesData.entities.push({ name, fields });
  }

  // 🔗 Gestion des relations
  const wantsRelation = readline.keyInYNStrict(
    "Souhaites-tu ajouter des relations entre les entités ?"
  );

  if (wantsRelation) {
    while (true) {
      console.log("\n🧩 Entités disponibles :");
      entitiesData.entities.forEach((ent, index) =>
        console.log(`  [${index}] ${ent.name}`)
      );

      const fromIndex = parseInt(
        readline.question("Depuis quelle entité ? (index) : "),
        10
      );
      const toIndex = parseInt(
        readline.question("Vers quelle entité ? (index) : "),
        10
      );
      const relType = readline.question(
        "Type de relation ? (1-1 / 1-n / n-n) : "
      );

      const from = entitiesData.entities[fromIndex];
      const to = entitiesData.entities[toIndex];

      if (!from || !to) {
        console.log("❌ Indice invalide, réessaye !");
        continue;
      }

      entitiesData.relations.push({
        from: from.name,
        to: to.name,
        type: relType,
      });

      const again = readline.keyInYNStrict("Ajouter une autre relation ?");
      if (!again) break;
    }
  }

  // Swagger (facultatif)
  let swaggerInputs;
  if (useSwagger) {
    swaggerInputs = getUserInputsSwagger();
  }

  return {
    projectName: projectName,
    /* databaseName,
    dbUser,
    dbPassword, */
    useYarn: useYarn,
    useDocker: useDocker,
    useAuth: useAuth,
    useSwagger: useSwagger,
    swaggerInputs: swaggerInputs,
    packageManager: packageManager,
    entitiesData: entitiesData,
    selectedDB: selectedDB.name, // ex: "postgresql"
    dbConfig: dbConfig, // toutes les réponses liées à la BDD choisie (clé = envVar)
  };
}

export async function getTestInputs() {
  console.log("\n🔹🔹🔹 Configuration du projet 🔹🔹🔹");

  const projectName = readline.question("Nom du projet: ");
  const entities = readline
    .question("Noms des entités (séparés par une virgule): ")
    .split(",")
    .map((e) => e.trim());

  // Retourne tous les inputs utilisateur
  return {
    projectName,
    entities,
  };
}

export function getUserInputsSwagger() {
  console.log("\n🔹 Configuration de Swagger 🔹");

  const title = readline.question("Titre de l'API ? (ex: Mon API) ", {
    defaultInput: "Mon API",
  });

  const description = readline.question(
    "Description de l'API ? (ex: API de gestion) ",
    {
      defaultInput: "API de gestion",
    }
  );

  const version = readline.question("Version de l'API ? (ex: 1.0.0) ", {
    defaultInput: "1.0.0",
  });

  const endpoint = readline.question("Endpoint Swagger (ex: api/docs) ", {
    defaultInput: "api/docs",
  });

  return { title, description, version, endpoint };
}
export async function createDirectory(directoryPath) {
  try {
    if (!fs.existsSync(directoryPath)) {
      fs.mkdirSync(directoryPath, { recursive: true });
      // console.log(`Dossier créé : ${directoryPath}`);
    } else {
      console.log(`Le dossier existe déjà : ${directoryPath}`);
    }
  } catch (error) {
    console.error(
      `Erreur lors de la création du dossier ${directoryPath}:`,
      error
    );
  }
}

export async function createFile(fileData) {
  // console.log("creating file....");
  try {
    if (!fs.existsSync(fileData.path)) {
      fs.writeFileSync(`${fileData.path}`, `${fileData.contente}`);
    } else {
      console.log(`Le fichier existe déjà : ${fileData.path}`);
      fs.writeFileSync(`${fileData.path}`, `${fileData.contente}`);
    }
  } catch (error) {
    console.error(
      `Erreur lors de la création du fichier ${fileData.path}:`,
      error
    );
  }
}

export async function updateFile({ path, pattern, replacement }) {
  try {
    let mainTs = fs.readFileSync(path, "utf8");

    // Si pattern est une string, on le convertit en RegExp
    /*   const regexPattern =
      typeof pattern === "string" ? new RegExp(pattern, "g") : pattern;

    if (!regexPattern.test(mainTs)) {
      console.warn(`Pattern not found in ${path}. No changes made.`);
      return;
    } */

    const updatedContent = mainTs.replace(pattern, replacement);
    await fs.writeFileSync(path, updatedContent, "utf-8");
    // console.log(`✅ Updated file: ${path}`);
  } catch (error) {
    console.error(`❌ Error updating file ${path}:`, error);
  }
}

export async function safeUpdateAppModule(entity) {
  const filePath = "src/app.module.ts";
  const moduleName = `${capitalize(entity)}Module`;

  const content = await fs.readFileSync(filePath, "utf-8");

  const importLine = `import {${moduleName}} from 'src/${entity}/${entity}.module';`;

  const importPatern = `import { ConfigModule } from '@nestjs/config';`;

  // Ajout de l'import s'il n'existe pas
  if (!content.includes(importLine)) {
    await updateFile({
      path: filePath,
      pattern: importPatern,
      replacement: `${importPatern}\n${importLine}`,
    });
  }

  // Regex qui capte le contenu de imports: [ ... ]
  const importRegexPatern = `imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Rendre ConfigModule accessible globalement
      envFilePath: '.env', // Charger les variables d'environnement
    }),`;
  // const contentRegex = await fs.readFileSync(filePath, "utf-8");

  if (!content.includes(moduleName)) {
    await updateFile({
      path: filePath,
      pattern: importRegexPatern,
      replacement: `${importRegexPatern}\n${moduleName},\n`,
    });
  }
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function decapitalize(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}
