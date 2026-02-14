const fs = require("fs");
const path = require("path");
const { logError } = require("../utils/loggers/logError");
const { logInfo } = require("../utils/loggers/logInfo");
const { logWarning } = require("../utils/loggers/logWarning");
const generateCleanModule = require("../utils/generators/cleanModuleGenerator");
const { askEntityInputs } = require("../utils/interactive/askEntityInputs");

async function generate(subCommand, targetName, flags) {
  // 1. Localisation of config file
  const configPath = path.join(process.cwd(), ".nestcraftx", ".nestcraftxrc");

  // 2. Existing Vérification
  if (!fs.existsSync(configPath)) {
    logError("Aucun fichier de configuration NestcraftX trouvé.");
    logInfo(
      "Assurez-vous d'être à la racine du projet ou lancez 'nestcraftx g-conf' ou 'nestcraftx generate-conf' pour le restaurer.",
    );
    return;
  }

  // 3. Lecture et parsing de la configuration complète
  let projectConfig;
  try {
    const rawData = fs.readFileSync(configPath, "utf8");
    projectConfig = JSON.parse(rawData);
  } catch (err) {
    logError(
      "Erreur lors de la lecture du fichier .nestcraftxrc. Le JSON est peut-être corrompu.\nlancez 'nestcraftx generate-conf' ou 'nestcraftx g-conf' pour le restaurer",
    );
    return;
  }

  // 4. Extraction des infos clés pour les passer aux générateurs
  const { mode, orm, auth, swagger, database } = projectConfig;

  // 5. Dispatcher vers les implémentations
  switch (subCommand) {
    case "module":
      if (!targetName) {
        logWarning(
          "⚠️ Veuillez préciser le nom du module (ex: nestcraftx g module Product)",
        );
        return;
      }

      // Ici, on passera projectConfig complet pour avoir accès à swagger, auth, etc.
      await handleModuleGeneration(targetName, projectConfig);
      break;

    case "auth":
      if (auth) {
        logWarning("L'authentification est déjà configurée dans ce projet.");
        return;
      }
      // Logique pour ajouter l'auth après coup
      await handleAuthGeneration(projectConfig);
      break;

    default:
      logError(`Sous-commande inconnue : ${subCommand}`);
      console.log("\nUtilisations possibles :");
      console.log("  nestcraftx g module <name>");
      console.log("  nestcraftx g auth");
      break;
  }
}

// --- Fonctions de redirection (prochainement implémentées) ---

async function handleModuleGeneration(name, config) {
  logInfo(
    `🚀 Générating module '${name}' (${config.mode.toUpperCase()} | ${config.orm.toUpperCase()})...`,
  );
  // 1. Demander les champs de l'entité interactivement
  const entityData = await askEntityInputs(name);

  if (config.mode === "full") {
    await generateCleanModule(name, config, entityData);
  } else {
    // await require('../utils/generators/mvpModuleGenerator')(name, config);
  }
}

async function handleAuthGeneration(config) {
  // On réutilisera ton script setupAuth corrigé
  // await require('../utils/setups/setupAuth')(config);

  logInfo("🚀 Generating module auth...");
}

module.exports = generate;
