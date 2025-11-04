import * as readline from "readline-sync";
import * as fs from "fs";
import { logInfo } from "./loggers/logInfo.js";

export async function getUserInputs2() {
  console.log("\n🔹🔹🔹 Configuration du projet 🔹🔹🔹\n");

  const dataBases = [
    {
      name: "postgresql",
      label: "PostgreSQL",
      ormOptions: ["prisma", "typeorm"],
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
    {
      name: "mongodb",
      label: "MongoDB",
      ormOptions: ["mongoose"],
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
  ];

  // Validation du nom du projet
  let projectName;
  while (true) {
    projectName = readline.question("Nom du projet: ");
    if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(projectName)) break;
    console.log(
      "❌ Nom de projet invalide. Lettres, chiffres, _ ou - uniquement, commencez par une lettre."
    );
  }

  // Sélection de la base de données avec validation
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
  selectedDB.required.forEach((field) => {
    let answer;
    while (true) {
      answer = readline.question(
        `${field.title} (par défaut: ${field.defaultValue}) : `,
        { hideEchoBack: field.hideEchoBack }
      );
      if (answer || field.defaultValue !== null) break;
      console.log("❌ Ce champ est requis.");
    }
    dbConfig[field.envVar] = answer || field.defaultValue;
  });

  // Choix de l'ORM avec validation
  if (selectedDB.ormOptions && selectedDB.ormOptions.length > 0) {
    let ormChoice;
    while (true) {
      ormChoice = readline.question(
        `Choisissez un ORM pour ${
          selectedDB.label
        } (${selectedDB.ormOptions.join(", ")}): `
      );
      if (!ormChoice) ormChoice = selectedDB.ormOptions[0];
      if (selectedDB.ormOptions.includes(ormChoice.toLowerCase())) break;
      console.log(
        "❌ ORM non reconnu. Choix possibles :",
        selectedDB.ormOptions.join(", ")
      );
    }
    dbConfig.orm = ormChoice.toLowerCase();
  }

  const useYarn = readline.keyInYNStrict("Utiliser Yarn ?");
  const useDocker = readline.keyInYNStrict(
    "Voulez-vous générer un fichier Docker?"
  );
  const useAuth = readline.keyInYNStrict(
    "Voulez-vous ajouter une authentification JWT?"
  );
  const useSwagger = readline.keyInYNStrict("Voulez-vous installer Swagger?");
  const packageManager = useYarn ? "yarn" : "npm";

  // Saisie des entités et champs avec validation
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

  let addEntity = readline.keyInYNStrict("Voulez-vous ajouter une entité ?");
  while (addEntity) {
    // Validation du nom d'entité
    let name;
    while (true) {
      name = readline.question("Nom de l'entité (lettres, chiffres, _): ");
      if (/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) break;
      console.log(
        "❌ Nom invalide. Utilisez uniquement lettres, chiffres, _ et commencez par une lettre."
      );
    }

    // Saisie des champs avec validation
    const fields = [];
    while (true) {
      let fname = readline.question("  ➤ Nom du champ (vide pour terminer) : ");
      if (!fname) break;
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(fname)) {
        console.log(
          "❌ Nom de champ invalide. Lettres, chiffres, _ uniquement, commencez par une lettre."
        );
        continue;
      }
      let ftype;
      while (true) {
        ftype = readline.question(
          `    Type du champ "${fname}" (string, number, boolean, Date, enum, etc.) : `
        );
        if (ftype) break;
        console.log("❌ Type de champ requis.");
      }
      fields.push({ name: fname, type: ftype });
    }

    entitiesData.entities.push({ name, fields });

    addEntity = readline.keyInYNStrict(
      "Voulez-vous ajouter une autre entité ?"
    );
  }

  // Gestion des relations avec validation
  const wantsRelation = readline.keyInYNStrict(
    "Souhaites-tu ajouter des relations entre les entités ?"
  );
  if (wantsRelation && entitiesData.entities.length > 1) {
    while (true) {
      console.log("\n🧩 Entités disponibles :");
      entitiesData.entities.forEach((ent, index) =>
        console.log(`  [${index}] ${ent.name}`)
      );

      let fromIndex, toIndex;
      while (true) {
        fromIndex = parseInt(
          readline.question("Depuis quelle entité ? (index) : "),
          10
        );
        if (!isNaN(fromIndex) && entitiesData.entities[fromIndex]) break;
        console.log("❌ Indice invalide, réessaye !");
      }
      while (true) {
        toIndex = parseInt(
          readline.question("Vers quelle entité ? (index) : "),
          10
        );
        if (!isNaN(toIndex) && entitiesData.entities[toIndex]) break;
        console.log("❌ Indice invalide, réessaye !");
      }

      let relType;
      while (true) {
        relType = readline.question("Type de relation ? (1-1 / 1-n / n-n) : ");
        if (["1-1", "1-n", "n-n"].includes(relType)) break;
        console.log(
          "❌ Type de relation invalide. Choix possibles : 1-1, 1-n, n-n"
        );
      }

      const from = entitiesData.entities[fromIndex];
      const to = entitiesData.entities[toIndex];

      entitiesData.relations.push({
        from: from.name,
        to: to.name,
        type: relType,
      });

      if (relType === "1-1") {
        from.fields.push({
          name: `${to.name.toLowerCase()}Id`,
          type: "string",
        });
        to.fields.push({
          name: `${from.name.toLowerCase()}Id`,
          type: "string",
        });
      } else if (relType === "1-n") {
        to.fields.push({
          name: `${from.name.toLowerCase()}Id`,
          type: "string",
        }); // ex: video.userId
        // pas de champ inverse dans from (user)
      } else if (relType === "n-n") {
        // pour n-n tu peux gérer ça plus tard avec une table pivot
        from.fields.push({
          name: `${to.name.toLowerCase()}Ids`,
          type: "string[]",
        });
        to.fields.push({
          name: `${from.name.toLowerCase()}Ids`,
          type: "string[]",
        });
      }

      const again = readline.keyInYNStrict("Ajouter une autre relation ?");
      if (!again) break;
    }
  } else if (wantsRelation) {
    console.log("❌ Il faut au moins deux entités pour créer une relation.");
  }

  // Swagger (facultatif)
  let swaggerInputs;
  if (useSwagger) {
    swaggerInputs = getUserInputsSwagger();
  }

  return {
    projectName: projectName,
    useYarn: useYarn,
    useDocker: useDocker,
    useAuth: useAuth,
    useSwagger: useSwagger,
    swaggerInputs: swaggerInputs,
    packageManager: packageManager,
    entitiesData: entitiesData,
    selectedDB: selectedDB.name,
    dbConfig: dbConfig,
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
  // logInfo(`🧩 Vérification de AppModule pour: ${entity}`);
  const filePath = "src/app.module.ts";
  const moduleName = `${capitalize(entity)}Module`;
  const importLine = `import { ${moduleName} } from 'src/${entity}/${entity}.module';`;

  let content = fs.readFileSync(filePath, "utf-8");

  // --- Étape 1 : Ajout de l'import si nécessaire
  if (!content.includes(importLine)) {
    // logInfo(`➡️ Ajout de l'import pour ${moduleName}`);
    const importMarker = `import { ConfigModule } from '@nestjs/config';`;

    if (content.includes(importMarker)) {
      await updateFile({
        path: filePath,
        pattern: importMarker,
        replacement: `${importMarker}\n${importLine}`,
      });
      content = fs.readFileSync(filePath, "utf-8");
    } else {
      logInfo(
        "⚠️ Impossible de trouver le point d'insertion de l'import (ConfigModule manquant)"
      );
    }
  } /* else {
    logInfo(`✅ Import déjà présent pour ${moduleName}`);
  } */

  // --- Étape 2 : Vérifier le bloc des imports du @Module
  const importsBlockRegex = /imports:\s*\[((.|\n)*?)\]/m;
  const match = content.match(importsBlockRegex);

  if (!match) {
    logInfo("❌ Impossible de trouver le bloc 'imports' dans AppModule.");
    return;
  }

  const currentImportsBlock = match[1];
  const isAlreadyImportedInModule = currentImportsBlock.includes(moduleName);

  if (!isAlreadyImportedInModule) {
    logInfo(`🛠 Ajout de ${moduleName} dans le tableau 'imports'`);
    const updatedBlock = currentImportsBlock.trim().endsWith(",")
      ? `${currentImportsBlock.trim()} ${moduleName},`
      : `${currentImportsBlock.trim()}, ${moduleName},`;

    const newContent = content.replace(
      importsBlockRegex,
      `imports: [${updatedBlock}]`
    );
    fs.writeFileSync(filePath, newContent, "utf-8");
  } /* else {
    logInfo(`✅ ${moduleName} est déjà présent dans le tableau 'imports'`);
  } */

  // logInfo(`🎉 AppModule mis à jour avec succès pour: ${entity}`);
}

export function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

export function decapitalize(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}
