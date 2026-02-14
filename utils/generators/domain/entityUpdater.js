// src/utils/generators/domain/entityUpdater.js
const { updateFile, capitalize } = require("../../userInput");
const fs = require("fs");

async function updateExistingEntityRelation(
  targetName,
  newEntityName,
  relationType,
) {
  const targetLow = targetName.toLowerCase();
  const newCap = capitalize(newEntityName);
  const newLow = newEntityName.toLowerCase();
  const entityPath = `src/${targetLow}/domain/entities/${targetLow}.entity.ts`;

  if (!fs.existsSync(entityPath)) return;

  // Déterminer le champ à ajouter selon la relation
  let fieldToAdd = "";
  let typeToAdd = "";

  switch (relationType) {
    case "n-1": // L'inverse d'un n-1 est un 1-n (donc une liste)
      fieldToAdd = `${newLow}s`;
      typeToAdd = `${newCap}Entity[]`;
      break;
    case "1-n": // L'inverse d'un 1-n est un n-1 (donc un ID ou l'objet)
      fieldToAdd = `${newLow}Id`;
      typeToAdd = `string`;
      break;
    case "1-1":
      fieldToAdd = `${newLow}`;
      typeToAdd = `${newCap}Entity`;
      break;
    case "n-n":
      fieldToAdd = `${newLow}s`;
      typeToAdd = `${newCap}Entity[]`;
      break;
  }

  // 1. Ajouter l'import de la nouvelle entité au début du fichier (si c'est un type complexe)
  if (typeToAdd.includes("Entity")) {
    const importLine = `import { ${newCap}Entity } from 'src/${newLow}/domain/entities/${newLow}.entity';\n`;
    await updateFile({
      path: entityPath,
      pattern: /^/, // Début du fichier
      replacement: importLine,
    });
  }

  // 2. Injecter dans le constructeur (avant la parenthèse fermante)
  await updateFile({
    path: entityPath,
    pattern: /(constructor\([\s\S]*?)\n\s+\)/m,
    replacement: `$1\n    private readonly ${fieldToAdd}?: ${typeToAdd}, \n  )`,
  });

  // 3. Injecter le Getter (avant la méthode toJSON)
  const getterMethod = `\n  get${capitalize(fieldToAdd)}(): ${typeToAdd} | undefined {\n    return this.${fieldToAdd};\n  }\n`;
  await updateFile({
    path: entityPath,
    pattern: /toJSON\(\)/,
    replacement: `${getterMethod}\n  toJSON()`,
  });

  // 4. Injecter dans toJSON
  await updateFile({
    path: entityPath,
    pattern: /(toJSON\(\) \{[\s\S]*?return \{[\s\S]*?)\n\s+\};/m,
    replacement: `$1\n      ${fieldToAdd}: this.${fieldToAdd},}`,
  });
}

module.exports = { updateExistingEntityRelation };
