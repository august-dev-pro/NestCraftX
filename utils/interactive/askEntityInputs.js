// src/utils/interactive/askEntityInputs.js
const fs = require("fs");
const path = require("path");
const readline = require("readline-sync");
const inquirer = require("inquirer");
const { info, success } = require("../colors");
const { logWarning } = require("../loggers/logWarning");
const { capitalize } = require("../userInput");
const actualInquirer = inquirer.default || inquirer;

async function askEntityInputs(targetName) {
  const entity = { name: targetName, fields: [], relation: null };

  console.log(
    `\n${info("[ENTITY DESIGN]")} Define fields for "${targetName}" :`,
  );

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
      "boolean",
      "Date",
      "uuid",
      "json",
      "enum",
      "array",
      "object",
    ];

    const typeAnswer = await actualInquirer.prompt([
      {
        type: "list",
        name: "ftype",
        message: `Type for "${fname}"`,
        choices: baseTypeChoices,
      },
    ]);

    let ftype = typeAnswer.ftype;

    // Logique de raffinement des types (identique à ton script original)
    if (ftype === "array") {
      const inner = await actualInquirer.prompt([
        {
          type: "list",
          name: "innerType",
          message: `Type of elements for "${fname}[]"`,
          choices: baseTypeChoices.filter(
            (c) => c !== "array" && c !== "object",
          ),
        },
      ]);
      ftype = `${inner.innerType}[]`;
    } else if (ftype === "enum") {
      ftype = capitalize(fname) + "Enum";
    } else if (ftype === "object") {
      const obj = await actualInquirer.prompt([
        {
          type: "input",
          name: "val",
          message: "Complex type name :",
          default: "json",
        },
      ]);
      ftype = capitalize(obj.val);
    }

    entity.fields.push({ name: fname, type: ftype });
    console.log(`  Type for "${fname}" : ${ftype} ${success("[✓]")}`);
  }

  const relationData = await askRelationInputs(entity.name);
  entity.relation = relationData;

  return entity;
}

async function askRelationInputs(newEntityName) {
  const srcPath = path.join(process.cwd(), "src");

  // Sécurité : Vérifie si le dossier src existe
  if (!fs.existsSync(srcPath)) return null;

  const blacklist = [
    "common",
    "prisma",
    "auth",
    "mail",
    "infrastructure",
    "shared",
  ];

  const modules = fs.readdirSync(srcPath).filter((folder) => {
    const fullPath = path.join(srcPath, folder);

    // 1. D'abord vérifier si c'est un dossier (important pour éviter ENOTDIR)
    const isDirectory = fs.lstatSync(fullPath).isDirectory();
    if (!isDirectory) return false;

    // 2. Ensuite les autres filtres
    const isNotBlacklisted = !blacklist.includes(folder.toLowerCase());
    const isNotCurrent = folder.toLowerCase() !== newEntityName.toLowerCase();

    // 3. Enfin vérifier s'il y a un fichier .module.ts à l'intérieur
    const hasModuleFile = fs
      .readdirSync(fullPath)
      .some((file) => file.endsWith(".module.ts"));

    return isNotBlacklisted && isNotCurrent && hasModuleFile;
  });

  if (modules.length === 0) {
    console.log(info("\n[INFO] No existing modules found for relations."));
    return null;
  }

  const { wantRelation } = await actualInquirer.prompt([
    {
      type: "confirm",
      name: "wantRelation",
      message: "Add relation with an existing module?",
      default: false,
    },
  ]);

  if (!wantRelation) return null;

  // On demande les détails de la relation
  const relation = await actualInquirer.prompt([
    {
      type: "list",
      name: "target",
      message: "Select the target module:",
      choices: modules,
    },
    {
      type: "list",
      name: "type",
      message: "Relation type (NewEntity -> Target):",
      choices: [
        { name: "1-n (One-to-Many: This has many of those)", value: "1-n" },
        {
          name: "n-1 (Many-to-One: This belongs to one of those)",
          value: "n-1",
        },
        { name: "1-1 (One-to-One)", value: "1-1" },
        { name: "n-n (Many-to-Many)", value: "n-n" },
      ],
    },
  ]);

  return relation;
}

module.exports = { askEntityInputs };
