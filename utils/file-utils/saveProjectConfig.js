const fs = require("fs");
const path = require("path");

/**
 * Lit le package.json, fusionne les scripts et les dépendances, et réécrit le fichier.
 *
 * @param {object} inputs Les inputs du CLI (pour le chemin du projet et le nom)
 *
 */
async function saveProjectConfig(inputs) {
  const configDir = path.join(process.cwd(), ".nestcraftx");
  const configFile = path.join(configDir, ".nestcraftxrc");

  const configData = {
    name: inputs.projectName,
    mode: inputs.mode,
    orm: inputs.dbConfig.orm,
    database: inputs.selectedDB,
    auth: inputs.useAuth,
    swagger: inputs.useSwagger,
    packageManager: inputs.packageManager,
    docker: inputs.useDocker,
    generatedAt: new Date().toISOString(),
  };

  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configFile, JSON.stringify(configData, null, 2));
  } catch (error) {
    logWarning("Could not save project configuration file.");
  }
}

module.exports = { saveProjectConfig };
