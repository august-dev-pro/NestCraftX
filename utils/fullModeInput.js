const readline = require("readline-sync");
const { info, success, warning } = require("./colors");
const inquirer = require("inquirer");
const actualInquirer = inquirer.default || inquirer;

/* async function getFullModeInputs(projectName, flags) {
  console.log(
    `\n${info("[MODE FULL]")} Configuration complete avec Clean Architecture\n`
  );

  const dataBases = [
    {
      name: "postgresql",
      label: "PostgreSQL",
      ormOptions: ["prisma", "typeorm"],
      required: [
        {
          title: "Utilisateur PostgreSQL",
          envVar: "POSTGRES_USER",
          defaultValue: "postgres",
          hideEchoBack: false,
        },
        {
          title: "Mot de passe PostgreSQL",
          envVar: "POSTGRES_PASSWORD",
          defaultValue: "postgres",
          hideEchoBack: true, // Masquer le mot de passe
        },
        {
          title: "Nom de la base",
          envVar: "POSTGRES_DB",
          defaultValue: "mydb",
          hideEchoBack: false,
        },
        {
          title: "Hote PostgreSQL",
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
          title: "URI MongoDB",
          envVar: "MONGO_URI",
          defaultValue: "mongodb://localhost:27017",
          hideEchoBack: false,
        },
        {
          title: "Nom de la base",
          envVar: "MONGO_DB",
          defaultValue: "mydb",
          hideEchoBack: false,
        },
      ],
    },
  ];

  let currentProjectName = projectName;
  // La validation du nom de projet reste interactive en cas d'échec
  while (true) {
    if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(currentProjectName)) break;
    currentProjectName = readline.question(`${info("[?]")} Nom du projet : `);
    console.log(
      `${warning(
        "[!]"
      )} Nom invalide. Utilisez lettres, chiffres, _ ou - (commencez par une lettre).`
    );
  }

  // --- 1. Base de Données ---
  const defaultDB = "postgresql";
  let usedDB;

  // Prioriser le flag 'db' si présent
  if (flags.db && flags.db !== undefined) {
    usedDB = getFlagValue(flags, "db", defaultDB);
    console.log(
      `${info(
        "[?]"
      )} Base de donnees (postgresql, mongodb) : ${usedDB} ${success("[flag]")}`
    );
  } else {
    usedDB = readline.question(
      `${info("[?]")} Base de donnees (postgresql, mongodb) [${defaultDB}] : `,
      { defaultInput: defaultDB }
    );
  }

  let selectedDB = dataBases.find(
    (db) => db.name.toLowerCase() === usedDB.toLowerCase()
  );

  // Revenir au mode interactif si le flag fourni est invalide ou si l'utilisateur a saisi une valeur invalide
  while (!selectedDB) {
    console.log(`${warning("[!]")} Base de donnees non reconnue.`);
    usedDB = readline.question(
      `${info("[?]")} Base de donnees (postgresql, mongodb) : `
    );
    selectedDB = dataBases.find(
      (db) => db.name.toLowerCase() === usedDB.toLowerCase()
    );
  }

  // --- 2. Configuration DB (Utilisation des flags) ---
  const dbConfig = {};
  console.log(`\n${info("[INFO]")} Configuration ${selectedDB.label}`);

  selectedDB.required.forEach((field) => {
    // Détermine la clé de flag (ex: 'dbUser' pour POSTGRES_USER ou 'mongoUri' pour MONGO_URI)
    const flagName = field.envVar
      .toLowerCase()
      .replace("postgres_", "db")
      .replace("mongo_", "mongo");

    const flagValue = flags[flagName];
    let answer;

    if (flagValue !== undefined) {
      // Flag est présent, utiliser sa valeur directement et sauter l'invite
      answer = getFlagValue(flags, flagName, field.defaultValue);

      const displayValue = field.hideEchoBack ? "***" : answer;
      console.log(`  ${field.title} : ${displayValue} ${success("[flag]")}`);
    } else {
      // Flag est absent, poser la question
      while (true) {
        answer = readline.question(
          `  ${field.title} [${field.defaultValue}] : `,
          {
            hideEchoBack: field.hideEchoBack,
            defaultInput: field.defaultValue,
          }
        );

        // Si l'utilisateur a saisi quelque chose OU si la valeur par défaut est non nulle, continuer
        if (answer || field.defaultValue !== null) break;
        console.log(`${warning("[!]")} Ce champ est requis.`);
      }
      // Si l'utilisateur a appuyé sur Entrée sans saisir, utiliser la valeur par défaut
      answer = answer || field.defaultValue;
    }
    dbConfig[field.envVar] = answer;
  });

  // --- 3. ORM ---
  if (selectedDB.ormOptions && selectedDB.ormOptions.length > 0) {
    const defaultOrm = selectedDB.ormOptions[0];
    let ormChoice;

    if (flags.orm !== undefined) {
      // Flag 'orm' est présent
      ormChoice = getFlagValue(flags, "orm", defaultOrm);

      if (selectedDB.ormOptions.includes(ormChoice.toLowerCase())) {
        // Flag valide
        ormChoice = ormChoice.toLowerCase();
        console.log(
          `${info("[?]")} ORM pour ${
            selectedDB.label
          } (${selectedDB.ormOptions.join(", ")}) : ${ormChoice} ${success(
            "[flag]"
          )}`
        );
      } else {
        // Flag invalide, revenir à l'interactif (l'utilisateur devra le resélectionner)
        console.log(
          `${warning(
            "[!]"
          )} ORM fourni par flag ('${ormChoice}') non reconnu. Reconfiguration...`
        );
        ormChoice = undefined;
      }
    }

    // Si ormChoice n'est pas encore défini (flag absent ou invalide), passer en mode interactif
    if (!ormChoice) {
      while (true) {
        ormChoice = readline.question(
          `${info("[?]")} ORM pour ${
            selectedDB.label
          } (${selectedDB.ormOptions.join(", ")}) [${defaultOrm}] : `
        );
        if (!ormChoice) ormChoice = defaultOrm;
        if (selectedDB.ormOptions.includes(ormChoice.toLowerCase())) break;
        console.log(
          `${warning(
            "[!]"
          )} ORM non reconnu. Choisissez : ${selectedDB.ormOptions.join(", ")}`
        );
      }
      dbConfig.orm = ormChoice.toLowerCase();
    }
  }

  // --- 4. Choix Booléens (Prioriser les flags) ---
  const booleanFlags = [
    { name: "yarn", default: false, prompt: "Utiliser Yarn ?" },
    { name: "docker", default: true, prompt: "Generer fichiers Docker ?" },
    { name: "auth", default: true, prompt: "Ajouter authentification JWT ?" },
    { name: "swagger", default: true, prompt: "Installer Swagger ?" },
  ];

  const booleanResults = {};

  booleanFlags.forEach(({ name, default: defaultValue, prompt }) => {
    let result;

    if (flags[name] !== undefined) {
      // Flag est présent, utiliser sa valeur
      result = getFlagValue(flags, name, defaultValue);
      const displayValue = result ? "Oui" : "Non";
      console.log(
        `${info("[?]")} ${prompt} : ${displayValue} ${success("[flag]")}`
      );
    } else {
      // Flag est absent, poser la question
      const defaultInput = defaultValue ? "y" : "n";
      result = readline.keyInYNStrict(`${info("[?]")} ${prompt}`, {
        defaultInput: defaultInput,
      });
    }
    booleanResults[name] = result;
  });

  const useYarn = booleanResults.yarn;
  const useDocker = booleanResults.docker;
  const useAuth = booleanResults.auth;
  const useSwagger = booleanResults.swagger;

  const packageManager = useYarn ? "yarn" : "npm";

  // --- 5. Configuration Swagger (Prioriser les flags) ---
  let swaggerInputs;
  if (useSwagger) {
    console.log(`\n${info("[INFO]")} Configuration Swagger`);
    const swaggerFields = [
      {
        name: "title",
        flag: "swaggerTitle",
        default: `${currentProjectName} API`,
        prompt: "Titre API",
      },
      {
        name: "description",
        flag: "swaggerDesc",
        default: "API generated by NestCraftX",
        prompt: "Description",
      },
      {
        name: "version",
        flag: "swaggerVersion",
        default: "1.0.0",
        prompt: "Version",
      },
      {
        name: "endpoint",
        flag: "swaggerEndpoint",
        default: "api/docs",
        prompt: "Endpoint",
      },
    ];

    swaggerInputs = {};

    swaggerFields.forEach((field) => {
      const flagValue = flags[field.flag];
      const defaultValue = field.default;

      if (flagValue !== undefined) {
        // Flag est présent, utiliser sa valeur
        swaggerInputs[field.name] = flagValue;
        console.log(`  ${field.prompt} : ${flagValue} ${success("[flag]")}`);
      } else {
        // Flag est absent, poser la question
        swaggerInputs[field.name] = readline.question(
          `  ${field.prompt} [${defaultValue}] : `,
          { defaultInput: defaultValue }
        );
      }
    });
  }

  // ... (Début de getFullModeInputs)

  // Assurez-vous d'importer la bibliothèque `inquirer` et d'avoir les fonctions utilitaires nécessaires (comme capitalize)

  // --- 6. Entités (Reste entièrement interactif) ---
  const entitiesData = { entities: [], relations: [] };

  if (useAuth) {
    console.log(
      `\n${success("[✓]")} Auth active : entite User ajoutee automatiquement`
    );
    entitiesData.entities.push({
      name: "user",
      fields: [
        { name: "email", type: "string" },
        { name: "password", type: "string" },
        { name: "isActive", type: "boolean" },
      ],
    });
  }

  console.log(
    `\n${info("[INFO]")} Saisie des entites (Mode FULL - Architecture complete)`
  );

  let addEntity = readline.keyInYNStrict(`${info("[?]")} Ajouter une entite ?`);

  while (addEntity) {
    let name;
    while (true) {
      name = readline.question(`\n  Nom de l'entite : `);
      if (/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) break;
      console.log(
        `${warning(
          "[!]"
        )} Nom invalide. Lettres, chiffres, _ (commencez par une lettre).`
      );
    }

    const fields = [];
    console.log(`  Champs pour "${name}" :`);
    while (true) {
      let fname = readline.question("    Nom du champ (vide pour terminer) : ");
      if (!fname) break;
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(fname)) {
        console.log(`${warning("[!]")} Nom de champ invalide.`);
        continue;
      }

      // 🛑 NOUVEAUX CHOIX : array et object
      const baseTypeChoices = [
        "string",
        "text",
        "number",
        "decimal",
        "boolean",
        "Date",
        "uuid",
        "json",
        "enum",
        "array", // Ajouté
        "object", // Ajouté
      ];

      const typeQuestion = {
        type: "list",
        name: "ftype",
        message: `Type de "${fname}"`,
        default: "string",
        choices: baseTypeChoices,
      };

      // Lancement du prompt principal
      const typeAnswer = await actualInquirer.prompt([typeQuestion]);
      let ftype = typeAnswer.ftype;

      // --- LOGIQUE SPÉCIFIQUE ---

      if (ftype === "array") {
        // --- PROMPT SPÉCIFIQUE POUR LE TYPE INTERNE DU TABLEAU ---
        const arrayInnerQuestion = {
          type: "list",
          name: "innerType",
          message: `Type des éléments de "${fname}[]"`,
          default: "string",
          // On exclut 'array' et 'object' pour garder une structure simple (pas de array de array)
          choices: baseTypeChoices.filter(
            (c) => c !== "array" && c !== "object"
          ),
        };

        const innerAnswer = await actualInquirer.prompt([arrayInnerQuestion]);
        // Le type final devient : string[] ou number[], etc.
        ftype = `${innerAnswer.innerType}[]`;
      } else if (ftype === "enum") {
        const enumName = capitalize(fname) + "Enum";
        console.log(
          `    ${info(
            "[INFO]"
          )} Type Enum sélectionné. Pensez à définir ${enumName} dans votre code.`
        );
        ftype = enumName;
      } else if (ftype === "object") {
        // Pour 'object', nous supposons que c'est un type complexe non primitif ou JSON.
        // On demande à l'utilisateur de nommer l'objet ou de le laisser en JSON
        const objectNameQuestion = {
          type: "input",
          name: "objectName",
          message: `Nom du type complexe (DTO/Class ou laissez 'json') :`,
          default: "json",
        };

        const objectAnswer = await actualInquirer.prompt([objectNameQuestion]);
        // Si l'utilisateur nomme l'objet (ex: 'Address'), le type devient 'Address'. Sinon 'json'.
        ftype = capitalize(objectAnswer.objectName.trim() || "json");
      }

      // 🟢 AFFICHAGE PROPRE ET ALIGNÉ
      console.log(`    Type de "${fname}" : ${ftype} ${success("[✓]")}`);

      fields.push({ name: fname, type: ftype });
    }

    entitiesData.entities.push({ name, fields });
    console.log(
      `${success("[✓]")} Entite "${name}" ajoutee avec ${
        fields.length
      } champ(s)`
    );

    addEntity = readline.keyInYNStrict(
      `${info("[?]")} Ajouter une autre entite ?`
    );
  }

  // --- 7. Relations (Reste entièrement interactif) ---

  const wantsRelation = readline.keyInYNStrict(
    `${info("[?]")} Ajouter des relations entre entites ?`
  );
  if (wantsRelation) {
    if (entitiesData.entities.length > 1) {
      console.log(`\n${info("[INFO]")} Configuration des relations`);
      while (true) {
        // ... (Logique de saisie des entités disponibles) ...
        console.log("\n  Entites disponibles :");
        entitiesData.entities.forEach((ent, index) =>
          console.log(`    [${index}] ${ent.name}`)
        );

        let fromIndex, toIndex;
        while (true) {
          fromIndex = parseInt(
            readline.question("  Depuis quelle entite ? (index) : "),
            10
          );
          if (!isNaN(fromIndex) && entitiesData.entities[fromIndex]) break;
          console.log(`${warning("[!]")} Indice invalide.`);
        }
        while (true) {
          toIndex = parseInt(
            readline.question("  Vers quelle entite ? (index) : "),
            10
          );
          if (!isNaN(toIndex) && entitiesData.entities[toIndex]) break;
          console.log(`${warning("[!]")} Indice invalide.`);
        }

        let relType;
        while (true) {
          // 🛑 CORRECTION 1 : Ajout de 'n-1'
          relType = readline.question(
            "  Type de relation (1-1 / 1-n / n-1 / n-n) : "
          );
          if (["1-1", "1-n", "n-1", "n-n"].includes(relType)) break;
          console.log(
            `${warning("[!]")} Type invalide. Choisissez : 1-1, 1-n, n-1, n-n`
          );
        }

        const from = entitiesData.entities[fromIndex];
        const to = entitiesData.entities[toIndex];

        entitiesData.relations.push({
          from: from.name,
          to: to.name,
          type: relType,
        });

        console.log(
          `${success("[✓]")} Relation ajoutee : ${from.name} ${relType} ${
            to.name
          }`
        );

        // --- Logique d'ajout des champs aux entités (Cruciale pour les DTO) ---

        if (relType === "1-1") {
          // Côté 'from' (ou 'to' si convention différente) porte la FK
          // Ajout de la clé étrangère (...Id)
          from.fields.push({
            name: `${to.name.toLowerCase()}Id`,
            type: "string",
          });
          // Ajout de l'objet relation (pour le DTO de Réponse)
          from.fields.push({
            name: to.name.toLowerCase(),
            type: to.name,
          });
        } else if (relType === "1-n") {
          // Côté "One" (Parent) : Ajout de la liste (ex: Article -> comments)
          from.fields.push({
            name: `${to.name.toLowerCase()}s`,
            type: `${to.name}[]`,
          });
          // 🛑 CORRECTION 2 : Côté "Many" (Enfant) : Ajout de la clé étrangère et de l'objet relation
          // Clé Étrangère (pour DTO de Requête)
          to.fields.push({
            name: `${from.name.toLowerCase()}Id`,
            type: "string",
          });
          // Objet de relation (pour DTO de Réponse)
          to.fields.push({
            name: from.name.toLowerCase(),
            type: from.name,
          });
        } else if (relType === "n-1") {
          // 🛑 NOUVEAU CAS : n-1
          // Côté "Many" (Enfant, source ici) : Ajout de la clé étrangère et de l'objet relation
          // Clé Étrangère (pour DTO de Requête)
          from.fields.push({
            name: `${to.name.toLowerCase()}Id`,
            type: "string",
          });
          // Objet de relation (pour DTO de Réponse)
          from.fields.push({
            name: to.name.toLowerCase(),
            type: to.name,
          });

          // Côté "One" (Parent, cible ici) : Ajout de la liste
          to.fields.push({
            name: `${from.name.toLowerCase()}s`,
            type: `${from.name}[]`,
          });
        } else if (relType === "n-n") {
          // Pour n-n, ajout des listes des deux côtés
          from.fields.push({
            name: `${to.name.toLowerCase()}s`,
            type: `${to.name}[]`,
          });
          to.fields.push({
            name: `${from.name.toLowerCase()}s`,
            type: `${from.name}[]`,
          });
        }

        const addMore = readline.keyInYNStrict(
          `${info("[?]")} Ajouter une autre relation ?`
        );
        if (!addMore) break;
      }
    } else {
      console.log(
        `${warning(
          "\n[INFO]"
        )} Il faut au moins deux entités pour configurer une relation.`
      );
    }
  }

  return {
    projectName: currentProjectName,
    useYarn,
    useDocker,
    useAuth,
    useSwagger,
    swaggerInputs,
    packageManager,
    entitiesData,
    selectedDB: selectedDB.name,
    dbConfig,
    mode: "full",
  };
} */

async function getFullModeInputs(projectName, flags) {
  console.log(
    // 🇫🇷 [MODE FULL] Configuration complete avec Clean Architecture
    `\n${info("[FULL MODE]")} Complete configuration with Clean Architecture\n`
  );

  const dataBases = [
    {
      name: "postgresql",
      label: "PostgreSQL",
      ormOptions: ["prisma", "typeorm"],
      required: [
        {
          // 🇫🇷 Utilisateur PostgreSQL
          title: "PostgreSQL User",
          envVar: "POSTGRES_USER",
          defaultValue: "postgres",
          hideEchoBack: false,
        },
        {
          // 🇫🇷 Mot de passe PostgreSQL
          title: "PostgreSQL Password",
          envVar: "POSTGRES_PASSWORD",
          defaultValue: "postgres",
          hideEchoBack: true, // Hide password
        },
        {
          // 🇫🇷 Nom de la base
          title: "Database Name",
          envVar: "POSTGRES_DB",
          defaultValue: "mydb",
          hideEchoBack: false,
        },
        {
          // 🇫🇷 Hote PostgreSQL
          title: "PostgreSQL Host",
          envVar: "POSTGRES_HOST",
          defaultValue: "localhost",
          hideEchoBack: false,
        },
        {
          // 🇫🇷 Port PostgreSQL
          title: "PostgreSQL Port",
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
          // 🇫🇷 URI MongoDB
          title: "MongoDB URI",
          envVar: "MONGO_URI",
          defaultValue: "mongodb://localhost:27017",
          hideEchoBack: false,
        },
        {
          // 🇫🇷 Nom de la base
          title: "Database Name",
          envVar: "MONGO_DB",
          defaultValue: "mydb",
          hideEchoBack: false,
        },
      ],
    },
  ];

  let currentProjectName = projectName;
  // La validation du nom de projet reste interactive en cas d'échec
  while (true) {
    if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(currentProjectName)) break;
    // 🇫🇷 Nom du projet :
    currentProjectName = readline.question(`${info("[?]")} Project name : `);
    console.log(
      // 🇫🇷 Nom invalide. Utilisez lettres, chiffres, _ ou - (commencez par une lettre).
      `${warning(
        "[!]"
      )} Invalid name. Use letters, numbers, _ or - (start with a letter).`
    );
  }

  // --- 1. Database Selection ---
  const defaultDB = "postgresql";
  let usedDB;

  // Prioriser le flag 'db' si présent
  if (flags.db && flags.db !== undefined) {
    usedDB = getFlagValue(flags, "db", defaultDB);
    console.log(
      // 🇫🇷 Base de donnees (postgresql, mongodb) : ${usedDB} [flag]
      `${info("[?]")} Database (postgresql, mongodb) : ${usedDB} ${success(
        "[flag]"
      )}`
    );
  } else {
    usedDB = readline.question(
      // 🇫🇷 Base de donnees (postgresql, mongodb) [${defaultDB}] :
      `${info("[?]")} Database (postgresql, mongodb) [${defaultDB}] : `,
      { defaultInput: defaultDB }
    );
  }

  let selectedDB = dataBases.find(
    (db) => db.name.toLowerCase() === usedDB.toLowerCase()
  );

  // Revenir au mode interactif si le flag fourni est invalide ou si l'utilisateur a saisi une valeur invalide
  while (!selectedDB) {
    // 🇫🇷 Base de donnees non reconnue.
    console.log(`${warning("[!]")} Database not recognized.`);
    // 🇫🇷 Base de donnees (postgresql, mongodb) :
    usedDB = readline.question(
      `${info("[?]")} Database (postgresql, mongodb) : `
    );
    selectedDB = dataBases.find(
      (db) => db.name.toLowerCase() === usedDB.toLowerCase()
    );
  }

  // --- 2. DB Configuration (Using flags) ---
  const dbConfig = {};
  console.log(`\n${info("[INFO]")} ${selectedDB.label} Configuration`);

  selectedDB.required.forEach((field) => {
    // Détermine la clé de flag (ex: 'dbUser' pour POSTGRES_USER ou 'mongoUri' pour MONGO_URI)
    const flagName = field.envVar
      .toLowerCase()
      .replace("postgres_", "db")
      .replace("mongo_", "mongo");

    const flagValue = flags[flagName];
    let answer;

    if (flagValue !== undefined) {
      // Flag is present, use its value directly and skip prompt
      answer = getFlagValue(flags, flagName, field.defaultValue);

      const displayValue = field.hideEchoBack ? "***" : answer;
      // 🇫🇷 ${field.title} : ${displayValue} [flag]
      console.log(`  ${field.title} : ${displayValue} ${success("[flag]")}`);
    } else {
      // Flag is absent, ask the question
      while (true) {
        // 🇫🇷 ${field.title} [${field.defaultValue}] :
        answer = readline.question(
          `  ${field.title} [${field.defaultValue}] : `,
          {
            hideEchoBack: field.hideEchoBack,
            defaultInput: field.defaultValue,
          }
        );

        // If the user entered something OR if the default value is non-null, continue
        if (answer || field.defaultValue !== null) break;
        // 🇫🇷 Ce champ est requis.
        console.log(`${warning("[!]")} This field is required.`);
      }
      // If the user just pressed Enter, use the default value
      answer = answer || field.defaultValue;
    }
    dbConfig[field.envVar] = answer;
  });

  // --- 3. ORM Selection ---
  if (selectedDB.ormOptions && selectedDB.ormOptions.length > 0) {
    const defaultOrm = selectedDB.ormOptions[0];
    let ormChoice;

    if (flags.orm !== undefined) {
      // Flag 'orm' is present
      ormChoice = getFlagValue(flags, "orm", defaultOrm);

      if (selectedDB.ormOptions.includes(ormChoice.toLowerCase())) {
        // Valid flag
        ormChoice = ormChoice.toLowerCase();
        console.log(
          // 🇫🇷 ORM pour ${selectedDB.label} (${selectedDB.ormOptions.join(", ")}) : ${ormChoice} [flag]
          `${info("[?]")} ORM for ${
            selectedDB.label
          } (${selectedDB.ormOptions.join(", ")}) : ${ormChoice} ${success(
            "[flag]"
          )}`
        );
      } else {
        // Invalid flag, fall back to interactive mode
        console.log(
          // 🇫🇷 ORM fourni par flag ('${ormChoice}') non reconnu. Reconfiguration...
          `${warning(
            "[!]"
          )} ORM provided by flag ('${ormChoice}') not recognized. Reconfiguring...`
        );
        ormChoice = undefined;
      }
    }

    // If ormChoice is not yet defined (flag absent or invalid), switch to interactive mode
    if (!ormChoice) {
      while (true) {
        ormChoice = readline.question(
          // 🇫🇷 ORM pour ${selectedDB.label} (${selectedDB.ormOptions.join(", ")}) [${defaultOrm}] :
          `${info("[?]")} ORM for ${
            selectedDB.label
          } (${selectedDB.ormOptions.join(", ")}) [${defaultOrm}] : `
        );
        if (!ormChoice) ormChoice = defaultOrm;
        if (selectedDB.ormOptions.includes(ormChoice.toLowerCase())) break;
        console.log(
          // 🇫🇷 ORM non reconnu. Choisissez : ${selectedDB.ormOptions.join(", ")}
          `${warning(
            "[!]"
          )} ORM not recognized. Choose from: ${selectedDB.ormOptions.join(
            ", "
          )}`
        );
      }
      dbConfig.orm = ormChoice.toLowerCase();
    }
  }

  // --- 4. Boolean Choices (Prioritize flags) ---
  const booleanFlags = [
    // 🇫🇷 Utiliser Yarn ?
    { name: "yarn", default: false, prompt: "Use Yarn?" },
    // 🇫🇷 Generer fichiers Docker ?
    { name: "docker", default: true, prompt: "Generate Docker files?" },
    // 🇫🇷 Ajouter authentification JWT ?
    { name: "auth", default: true, prompt: "Add JWT authentication?" },
    // 🇫🇷 Installer Swagger ?
    { name: "swagger", default: true, prompt: "Install Swagger?" },
  ];

  const booleanResults = {};

  booleanFlags.forEach(({ name, default: defaultValue, prompt }) => {
    let result;

    if (flags[name] !== undefined) {
      // Flag is present, use its value
      result = getFlagValue(flags, name, defaultValue);
      // 🇫🇷 Oui / Non
      const displayValue = result ? "Yes" : "No";
      console.log(
        `${info("[?]")} ${prompt} : ${displayValue} ${success("[flag]")}`
      );
    } else {
      // Flag is absent, ask the question
      const defaultInput = defaultValue ? "y" : "n";
      result = readline.keyInYNStrict(`${info("[?]")} ${prompt}`, {
        defaultInput: defaultInput,
      });
    }
    booleanResults[name] = result;
  });

  const useYarn = booleanResults.yarn;
  const useDocker = booleanResults.docker;
  const useAuth = booleanResults.auth;
  const useSwagger = booleanResults.swagger;

  const packageManager = useYarn ? "yarn" : "npm";

  // --- 5. Swagger Configuration (Prioritize flags) ---
  let swaggerInputs;
  if (useSwagger) {
    // 🇫🇷 Configuration Swagger
    console.log(`\n${info("[INFO]")} Swagger Configuration`);
    const swaggerFields = [
      {
        name: "title",
        flag: "swaggerTitle",
        default: `${currentProjectName} API`,
        prompt: "API Title",
      },
      {
        name: "description",
        flag: "swaggerDesc",
        default: "API generated by NestCraftX",
        prompt: "Description",
      },
      {
        name: "version",
        flag: "swaggerVersion",
        default: "1.0.0",
        prompt: "Version",
      },
      {
        name: "endpoint",
        flag: "swaggerEndpoint",
        default: "api/docs",
        prompt: "Endpoint",
      },
    ];

    swaggerInputs = {};

    swaggerFields.forEach((field) => {
      const flagValue = flags[field.flag];
      const defaultValue = field.default;

      if (flagValue !== undefined) {
        // Flag is present, use its value
        swaggerInputs[field.name] = flagValue;
        console.log(`  ${field.prompt} : ${flagValue} ${success("[flag]")}`);
      } else {
        // Flag is absent, ask the question
        swaggerInputs[field.name] = readline.question(
          `  ${field.prompt} [${defaultValue}] : `,
          { defaultInput: defaultValue }
        );
      }
    });
  }

  // --- 6. Entities (Remains fully interactive) ---
  const entitiesData = { entities: [], relations: [] };

  if (useAuth) {
    console.log(
      // 🇫🇷 Auth active : entite User ajoutee automatiquement
      `\n${success("[✓]")} Auth active: User entity added automatically`
    );
    entitiesData.entities.push({
      name: "user",
      fields: [
        { name: "email", type: "string" },
        { name: "password", type: "string" },
        { name: "isActive", type: "boolean" },
      ],
    });
  }

  console.log(
    // 🇫🇷 Saisie des entites (Mode FULL - Architecture complete)
    `\n${info("[INFO]")} Entity input (FULL Mode - Complete Architecture)`
  );

  // 🇫🇷 Ajouter une entite ?
  let addEntity = readline.keyInYNStrict(`${info("[?]")} Add an entity?`);
  while (addEntity) {
    let name;
    while (true) {
      // 🇫🇷 Nom de l'entite :
      name = readline.question(`\n  Entity name : `);
      if (/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) break;
      console.log(
        // 🇫🇷 Nom invalide. Lettres, chiffres, _ (commencez par une lettre).
        `${warning(
          "[!]"
        )} Invalid name. Letters, numbers, _ (start with a letter).`
      );
    }

    const fields = [];
    // 🇫🇷 Champs pour "${name}" :
    console.log(`  Fields for "${name}" :`);
    while (true) {
      // 🇫🇷 Nom du champ (vide pour terminer) :
      let fname = readline.question(
        "    Field name (leave empty to finish) : "
      );
      if (!fname) break;
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(fname)) {
        // 🇫🇷 Nom de champ invalide.
        console.log(`${warning("[!]")} Invalid field name.`);
        continue;
      }

      // 🛑 NOUVEAUX CHOIX : array et object (choix restent en anglais car ce sont des types)
      const baseTypeChoices = [
        "string",
        "text",
        "number",
        "decimal",
        "boolean",
        "Date",
        "uuid",
        "json",
        "enum",
        "array",
        "object",
      ];

      const typeQuestion = {
        type: "list",
        name: "ftype",
        // 🇫🇷 Type de "${fname}"
        message: `Type for "${fname}"`,
        default: "string",
        choices: baseTypeChoices,
      };

      const typeAnswer = await actualInquirer.prompt([typeQuestion]);
      let ftype = typeAnswer.ftype;

      // --- LOGIQUE SPÉCIFIQUE (Traduction des messages) ---

      if (ftype === "array") {
        const arrayInnerQuestion = {
          type: "list",
          name: "innerType",
          // 🇫🇷 Type des éléments de "${fname}[]"
          message: `Type of elements for "${fname}[]"`,
          default: "string",
          choices: baseTypeChoices.filter(
            (c) => c !== "array" && c !== "object"
          ),
        };

        const innerAnswer = await actualInquirer.prompt([arrayInnerQuestion]);
        ftype = `${innerAnswer.innerType}[]`;
      } else if (ftype === "enum") {
        const enumName = capitalize(fname) + "Enum";
        console.log(
          // 🇫🇷 Type Enum sélectionné. Pensez à définir ${enumName} dans votre code.
          `    ${info(
            "[INFO]"
          )} Enum type selected. Consider defining ${enumName} in your code.`
        );
        ftype = enumName;
      } else if (ftype === "object") {
        const objectNameQuestion = {
          type: "input",
          name: "objectName",
          // 🇫🇷 Nom du type complexe (DTO/Class ou laissez 'json') :
          message: `Complex type name (DTO/Class or leave 'json') :`,
          default: "json",
        };

        const objectAnswer = await actualInquirer.prompt([objectNameQuestion]);
        ftype = capitalize(objectAnswer.objectName.trim() || "json");
      }

      // 🟢 AFFICHAGE PROPRE ET ALIGNÉ
      // 🇫🇷 Type de "${fname}" : ${ftype} [✓]
      console.log(`    Type for "${fname}" : ${ftype} ${success("[✓]")}`);

      fields.push({ name: fname, type: ftype });
    }

    entitiesData.entities.push({ name, fields });
    console.log(
      // 🇫🇷 Entite "${name}" ajoutee avec ${fields.length} champ(s)
      `${success("[✓]")} Entity "${name}" added with ${fields.length} field(s)`
    );

    // 🇫🇷 Ajouter une autre entite ?
    addEntity = readline.keyInYNStrict(`${info("[?]")} Add another entity?`);
  }

  // --- 7. Relations (Remains fully interactive) ---

  // 🇫🇷 Ajouter des relations entre entites ?
  const wantsRelation = readline.keyInYNStrict(
    `${info("[?]")} Add relationships between entities?`
  );
  if (wantsRelation) {
    if (entitiesData.entities.length > 1) {
      // 🇫🇷 Configuration des relations
      console.log(`\n${info("[INFO]")} Configuring relationships`);
      while (true) {
        // 🇫🇷 Entites disponibles :
        console.log("\n  Available Entities :");
        entitiesData.entities.forEach((ent, index) =>
          console.log(`    [${index}] ${ent.name}`)
        );

        let fromIndex, toIndex;
        while (true) {
          // 🇫🇷 Depuis quelle entite ? (index) :
          fromIndex = parseInt(
            readline.question("  From which entity? (index) : "),
            10
          );
          if (!isNaN(fromIndex) && entitiesData.entities[fromIndex]) break;
          // 🇫🇷 Indice invalide.
          console.log(`${warning("[!]")} Invalid index.`);
        }
        while (true) {
          // 🇫🇷 Vers quelle entite ? (index) :
          toIndex = parseInt(
            readline.question("  To which entity? (index) : "),
            10
          );
          if (!isNaN(toIndex) && entitiesData.entities[toIndex]) break;
          // 🇫🇷 Indice invalide.
          console.log(`${warning("[!]")} Invalid index.`);
        }

        let relType;
        while (true) {
          // 🇫🇷 Type de relation (1-1 / 1-n / n-1 / n-n) :
          relType = readline.question(
            "  Relationship type (1-1 / 1-n / n-1 / n-n) : "
          );
          if (["1-1", "1-n", "n-1", "n-n"].includes(relType)) break;
          // 🇫🇷 Type invalide. Choisissez : 1-1, 1-n, n-1, n-n
          console.log(
            `${warning("[!]")} Invalid type. Choose from: 1-1, 1-n, n-1, n-n`
          );
        }

        const from = entitiesData.entities[fromIndex];
        const to = entitiesData.entities[toIndex];

        entitiesData.relations.push({
          from: from.name,
          to: to.name,
          type: relType,
        });

        console.log(
          // 🇫🇷 Relation ajoutee : ${from.name} ${relType} ${to.name}
          `${success("[✓]")} Relationship added: ${from.name} ${relType} ${
            to.name
          }`
        );

        // --- Logique d'ajout des champs aux entités (inchangée) ---
        if (relType === "1-1") {
          from.fields.push({
            name: `${to.name.toLowerCase()}Id`,
            type: "string",
          });
          from.fields.push({
            name: to.name.toLowerCase(),
            type: to.name,
          });
        } else if (relType === "1-n") {
          from.fields.push({
            name: `${to.name.toLowerCase()}s`,
            type: `${to.name}[]`,
          });
          to.fields.push({
            name: `${from.name.toLowerCase()}Id`,
            type: "string",
          });
          to.fields.push({
            name: from.name.toLowerCase(),
            type: from.name,
          });
        } else if (relType === "n-1") {
          from.fields.push({
            name: `${to.name.toLowerCase()}Id`,
            type: "string",
          });
          from.fields.push({
            name: to.name.toLowerCase(),
            type: to.name,
          });
          to.fields.push({
            name: `${from.name.toLowerCase()}s`,
            type: `${from.name}[]`,
          });
        } else if (relType === "n-n") {
          from.fields.push({
            name: `${to.name.toLowerCase()}s`,
            type: `${to.name}[]`,
          });
          to.fields.push({
            name: `${from.name.toLowerCase()}s`,
            type: `${from.name}[]`,
          });
        }

        // 🇫🇷 Ajouter une autre relation ?
        const addMore = readline.keyInYNStrict(
          `${info("[?]")} Add another relationship?`
        );
        if (!addMore) break;
      }
    } else {
      console.log(
        // 🇫🇷 Il faut au moins deux entités pour configurer une relation.
        `${warning(
          "\n[INFO]"
        )} At least two entities are required to configure a relationship.`
      );
    }
  }

  return {
    projectName: currentProjectName,
    useYarn,
    useDocker,
    useAuth,
    useSwagger,
    swaggerInputs,
    packageManager,
    entitiesData,
    selectedDB: selectedDB.name,
    dbConfig,
    mode: "full",
  };
}

/**
 * Récupère la valeur d'un flag, ou la valeur par défaut si le flag n'est pas fourni.
 * Convertit les flags 'true'/'false' en booléens si nécessaire.
 * @param {object} flags - L'objet flags (ex: yargs)
 * @param {string} name - Nom du flag (ex: 'auth', 'dbHost')
 * @param {*} defaultValue - Valeur par défaut si le flag est absent.
 */
function getFlagValue(flags, name, defaultValue) {
  const value = flags[name];
  if (value !== undefined) {
    // Gérer les cas où yargs (ou autre) renvoie une chaîne pour les booléens
    if (value === "true") return true;
    if (value === "false") return false;
    return value;
  }
  return defaultValue;
}
module.exports = { getFullModeInputs };
