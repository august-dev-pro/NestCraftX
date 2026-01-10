const readline = require("readline-sync");
const { info, success, warning } = require("./colors");
const inquirer = require("inquirer");
const { capitalize } = require("./userInput");
const { logWarning } = require("./loggers/logWarning");
const { getPackageManager } = require("./utils");
const actualInquirer = inquirer.default || inquirer;

async function getFullModeInputs(projectName, flags) {
  console.log(
    `\n${info("[FULL MODE]")} Complete configuration with Clean Architecture\n`
  );

  const dataBases = [
    {
      name: "postgresql",
      label: "PostgreSQL",
      ormOptions: ["prisma", "typeorm"],
      required: [
        {
          title: "PostgreSQL User",
          envVar: "POSTGRES_USER",
          defaultValue: "postgres",
          hideEchoBack: false,
        },
        {
          title: "PostgreSQL Password",
          envVar: "POSTGRES_PASSWORD",
          defaultValue: "postgres",
          hideEchoBack: true, // Hide password
        },
        {
          title: "PostgreSQL Database Name",
          envVar: "POSTGRES_DB",
          defaultValue: `${projectName}-db`,
          hideEchoBack: false,
        },
        {
          title: "PostgreSQL Host",
          envVar: "POSTGRES_HOST",
          defaultValue: "localhost",
          hideEchoBack: false,
        },
        {
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
          title: "MongoDB URI",
          envVar: "MONGO_URI",
          defaultValue: "mongodb://localhost:27017",
          hideEchoBack: false,
        },
        {
          title: "MongoDB Database Name",
          envVar: "MONGO_DB",
          defaultValue: `${projectName}-db`,
          hideEchoBack: false,
        },
      ],
    },
  ];

  let currentProjectName = projectName;
  // La validation du nom de projet reste interactive en cas d'échec
  while (true) {
    if (/^[A-Za-z][A-Za-z0-9_-]*$/.test(currentProjectName)) break;

    currentProjectName = readline.question(`${info("[?]")} Project name : `);

    logWarning(
      "Invalid name. Use letters, numbers, _ or - (start with a letter)."
    );
  }

  // --- 1. Database Selection ---
  const defaultDB = "postgresql";
  let usedDB;

  // Prioriser le flag 'db' si présent
  if (flags.db && flags.db !== undefined) {
    usedDB = getFlagValue(flags, "db", defaultDB);
    console.log(
      `${info("[?]")} Database (postgresql, mongodb) : ${usedDB} ${success(
        "[flag]"
      )}`
    );
  } else {
    usedDB = readline.question(
      `${info("[?]")} Database (postgresql, mongodb) [${defaultDB}] : `,
      { defaultInput: defaultDB }
    );
  }

  let selectedDB = dataBases.find(
    (db) => db.name.toLowerCase() === usedDB.toLowerCase()
  );

  // Revenir au mode interactif si le flag fourni est invalide ou si l'utilisateur a saisi une valeur invalide
  while (!selectedDB) {
    logWarning("Database not recognized.");

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

      console.log(` ${field.title} : ${displayValue} ${success("[flag]")}`);
    } else {
      // Flag is absent, ask the question
      while (true) {
        answer = readline.question(
          ` ${field.title} [${field.defaultValue}] : `,
          {
            hideEchoBack: field.hideEchoBack,
            defaultInput: field.defaultValue,
          }
        );

        // If the user entered something OR if the default value is non-null, continue
        if (answer || field.defaultValue !== null) break;

        logWarning("This field is required.");
      }
      // If the user just pressed Enter, use the default value
      answer = answer || field.defaultValue;
    }
    dbConfig[field.envVar] = answer;
  });

  // --- 3. ORM Selection (Full Mode) ---
  if (selectedDB.ormOptions && selectedDB.ormOptions.length > 0) {
    const defaultOrm = selectedDB.ormOptions[0];
    let ormChoice;

    // 1. Vérification du Flag
    if (flags.orm !== undefined) {
      const flagValue = getFlagValue(flags, "orm", "").toLowerCase();

      if (selectedDB.ormOptions.includes(flagValue)) {
        ormChoice = flagValue;
        console.log(
          `${info("[?]")} ORM for ${selectedDB.label}: ${ormChoice} ${success(
            "[flag]"
          )}`
        );
      } else {
        logWarning(`ORM flag '${flagValue}' invalid for ${selectedDB.label}.`);
      }
    }

    // 2. Mode Interactif (si pas de flag ou flag invalide)
    if (!ormChoice) {
      const answers = await actualInquirer.prompt([
        {
          type: "list",
          name: "orm",
          message: `Choose an ORM for ${selectedDB.label}:`,
          choices: selectedDB.ormOptions.map((opt) => ({
            name: opt.charAt(0).toUpperCase() + opt.slice(1), // Capitalize label
            value: opt,
          })),
          default: defaultOrm,
        },
      ]);
      ormChoice = answers.orm;
    }

    dbConfig.orm = ormChoice;
  }

  const packageManager = await getPackageManager(flags);

  // --- 4. Boolean Choices (Prioritize flags) ---
  const booleanFlags = [
    { name: "docker", default: true, prompt: "Generate Docker files?" },

    { name: "auth", default: true, prompt: "Add JWT authentication?" },

    { name: "swagger", default: true, prompt: "Install Swagger?" },
  ];

  const booleanResults = {};

  booleanFlags.forEach(({ name, default: defaultValue, prompt }) => {
    let result;

    if (flags[name] !== undefined) {
      // Flag is present, use its value
      result = getFlagValue(flags, name, defaultValue);

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

  const useDocker = booleanResults.docker;
  const useAuth = booleanResults.auth;
  const useSwagger = booleanResults.swagger;

  // --- 5. Swagger Configuration (Prioritize flags) ---
  let swaggerInputs;
  if (useSwagger) {
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
        console.log(` ${field.prompt} : ${flagValue} ${success("[flag]")}`);
      } else {
        // Flag is absent, ask the question
        swaggerInputs[field.name] = readline.question(
          ` ${field.prompt} [${defaultValue}] : `,
          { defaultInput: defaultValue }
        );
      }
    });
  }

  // --- 6. Entities (Remains fully interactive) ---
  const entitiesData = { entities: [], relations: [] };

  if (useAuth) {
    console.log(
      `\n${info("[INFO]")} Auth active: adding User and Session entities`
    );

    // 1. Entité User
    entitiesData.entities.push({
      name: "user",
      fields: [
        { name: "email", type: "string", unique: true },
        { name: "password", type: "string" },
        { name: "role", type: "Role" },
        { name: "isActive", type: "boolean", default: true },
      ],
    });

    // 2. Entité Session
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

  console.log(
    `\n${info("[INFO]")} Entity input (FULL Mode - Complete Architecture)`
  );

  let addEntity = readline.keyInYNStrict(`${info("[?]")} Add an entity?`);
  while (addEntity) {
    let name;
    while (true) {
      name = readline.question(`\n Entity name : `);
      if (/^[A-Za-z][A-Za-z0-9_]*$/.test(name)) break;
      logWarning("Invalid name. Letters, numbers, _ (start with a letter).");
    }

    const fields = [];

    console.log(` Fields for "${name}" :`);
    while (true) {
      let fname = readline.question("  Field name (leave empty to finish) : ");
      if (!fname) break;
      if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(fname)) {
        logWarning("Invalid field name.");
        continue;
      }

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
        message: `Type for "${fname}"`,
        default: "string",
        choices: baseTypeChoices,
        transformer: () => "",
      };
      const typeAnswer = await actualInquirer.prompt([typeQuestion]);
      let ftype = typeAnswer.ftype;
      process.stdout.write("\x1B[1A");
      process.stdout.write("\x1B[K");

      if (ftype === "array") {
        const arrayInnerQuestion = {
          type: "list",
          name: "innerType",
          message: `Type of elements for "${fname}[]"`,
          default: "string",
          choices: baseTypeChoices.filter(
            (c) => c !== "array" && c !== "object"
          ),
          transformer: () => "",
        };

        const innerAnswer = await actualInquirer.prompt([arrayInnerQuestion]);
        ftype = `${innerAnswer.innerType}[]`;
      } else if (ftype === "enum") {
        const enumName = capitalize(fname) + "Enum";
        console.log(
          `  ${info(
            "[INFO]"
          )} Enum type selected. Consider defining ${enumName} in your code.`
        );
        ftype = enumName;
      } else if (ftype === "object") {
        const objectNameQuestion = {
          type: "input",
          name: "objectName",

          message: `Complex type name (DTO/Class or leave 'json') :`,
          default: "json",
          transformer: () => "",
        };

        const objectAnswer = await actualInquirer.prompt([objectNameQuestion]);
        ftype = capitalize(objectAnswer.objectName.trim() || "json");
      }

      console.log(`  Type for "${fname}" : ${ftype} ${success("[✓]")}`);

      fields.push({ name: fname, type: ftype });
    }

    entitiesData.entities.push({ name, fields });
    console.log(
      `${success("[✓]")} Entity "${name}" added with ${fields.length} field(s)`
    );

    addEntity = readline.keyInYNStrict(`${info("[?]")} Add another entity?`);
  }

  const wantsRelation = readline.keyInYNStrict(
    `${info("[?]")} Add relationships between entities?`
  );
  if (wantsRelation) {
    if (entitiesData.entities.length > 1) {
      console.log(`\n${info("[INFO]")} Configuring relationships`);

      let configuring = true;
      while (configuring) {
        const entityNames = entitiesData.entities.map((e) => e.name);

        // 1. Select entities first
        const selection = await actualInquirer.prompt([
          {
            type: "list",
            name: "fromName",
            message: "From which entity? (Source)",
            choices: entityNames,
          },
          {
            type: "list",
            name: "toName",
            message: (prev) =>
              `To which entity should ${prev.fromName} be linked? (Target)`,
            choices: (prev) =>
              entityNames.filter((name) => name !== prev.fromName),
          },
        ]);

        // --- VERIFICATION: Check if link already exists (A->B or B->A) ---
        const alreadyExists = entitiesData.relations.find(
          (rel) =>
            (rel.from === selection.fromName && rel.to === selection.toName) ||
            (rel.from === selection.toName && rel.to === selection.fromName)
        );

        if (alreadyExists) {
          logWarning(
            `A relationship already exists between ${selection.fromName} and ${selection.toName} (${alreadyExists.type}).`
          );

          const { tryAgain } = await actualInquirer.prompt([
            {
              type: "confirm",
              name: "tryAgain",
              message: "Do you want to choose different entities?",
              default: true,
            },
          ]);

          if (!tryAgain) break;
          continue; // Restart selection
        }

        // 2. Select Relationship type only if verification passed
        const typeAnswer = await actualInquirer.prompt([
          {
            type: "list",
            name: "relType",
            message: "Relationship type:",
            choices: [
              {
                name: `1-1 (One-to-One)   : ${selection.fromName} has one ${selection.toName}`,
                value: "1-1",
              },
              {
                name: `1-n (One-to-Many)  : ${selection.fromName} has many ${selection.toName}s`,
                value: "1-n",
              },
              {
                name: `n-1 (Many-to-One)  : Many ${selection.fromName}s belong to one ${selection.toName}`,
                value: "n-1",
              },
              {
                name: `n-n (Many-to-Many) : Many ${selection.fromName}s linked to many ${selection.toName}s`,
                value: "n-n",
              },
            ],
          },
        ]);

        const from = entitiesData.entities.find(
          (e) => e.name === selection.fromName
        );
        const to = entitiesData.entities.find(
          (e) => e.name === selection.toName
        );
        const relType = typeAnswer.relType;

        // Register Relationship
        entitiesData.relations.push({
          from: from.name,
          to: to.name,
          type: relType,
        });

        const fromLow = from.name.toLowerCase();
        const toLow = to.name.toLowerCase();

        // --- Add fields logic ---
        if (relType === "1-1") {
          from.fields.push(
            { name: `${toLow}Id`, type: "string" },
            { name: toLow, type: to.name }
          );
        } else if (relType === "1-n") {
          from.fields.push({ name: `${toLow}s`, type: `${to.name}[]` });
          to.fields.push(
            { name: `${fromLow}Id`, type: "string" },
            { name: fromLow, type: from.name }
          );
        } else if (relType === "n-1") {
          from.fields.push(
            { name: `${toLow}Id`, type: "string" },
            { name: toLow, type: to.name }
          );
          to.fields.push({ name: `${fromLow}s`, type: `${from.name}[]` });
        } else if (relType === "n-n") {
          from.fields.push({ name: `${toLow}s`, type: `${to.name}[]` });
          to.fields.push({ name: `${fromLow}s`, type: `${from.name}[]` });
        }

        console.log(
          `\n${success("[✓]")} Relationship added: ${from.name} ${relType} ${
            to.name
          }`
        );

        const { addMore } = await actualInquirer.prompt([
          {
            type: "confirm",
            name: "addMore",
            message: "Add another relationship?",
            default: false,
          },
        ]);
        configuring = addMore;
      }
    } else {
      logWarning(
        "At least two entities are required to configure a relationship."
      );
    }
  }

  return {
    projectName: currentProjectName,
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
