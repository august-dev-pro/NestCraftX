const fs = require("fs");
const path = require("path");
const { logError } = require("../loggers/logError");

/**
 * Lit le package.json, fusionne les scripts et les dépendances, et réécrit le fichier.
 *
 * @param {object} inputs Les inputs du CLI (pour le chemin du projet et le nom)
 * @param {object} scripts Les scripts à ajouter/mettre à jour (ex: { "seed": "npm run prisma:seed" })
 * @param {object} [devDependencies={}] Les dépendances de développement à ajouter/mettre à jour
 */
async function updatePackageJson(inputs, scripts, devDependencies = {}) {
  const projectPath = process.cwd();
  const packageJsonPath = path.join(projectPath, "package.json");

  try {
    // 1. Lire le contenu actuel
    const fileContent = fs.readFileSync(packageJsonPath, "utf8");
    const packageJson = JSON.parse(fileContent);

    // 2. Fusionner les scripts
    packageJson.scripts = {
      ...packageJson.scripts,
      ...scripts,
    };

    // 3. Fusionner les dépendances de développement (si fournies)
    packageJson.devDependencies = {
      ...packageJson.devDependencies,
      ...devDependencies,
    };

    // 4. Réécrire le fichier (avec une indentation de 2 espaces pour la lisibilité)
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Note: Les dépendances installées via runCommand (npm install X) sont déjà dans package.json,
    // cette fonction est surtout utile pour les scripts personnalisés ou les dépendances manquantes.
  } catch (error) {
    logError(
      `❌ Erreur lors de la mise à jour de package.json pour ${inputs.projectName}:`,
      error.message
    );
    throw new Error(
      `Échec de la mise à jour du fichier package.json., ${error.message}`
    );
  }
}

module.exports = { updatePackageJson };
