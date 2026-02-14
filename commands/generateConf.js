const fs = require("fs");
const path = require("path");
const { logSuccess } = require("../utils/loggers/logSuccess");
const { logInfo } = require("../utils/loggers/logInfo");
const { logError } = require("../utils/loggers/logError");

async function generateConf() {
  logInfo("🔍 Analyse du projet pour reconstruire la configuration...");

  const root = process.cwd();
  const pkgPath = path.join(root, "package.json");

  if (!fs.existsSync(pkgPath)) {
    logError(
      "❌ Erreur : Aucun package.json trouvé. Es-tu à la racine d'un projet NestJS ?",
    );
    return;
  }

  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8"));
  const deps = { ...pkg.dependencies, ...pkg.devDependencies };

  // 1. Détecter le Mode (Architecture)
  // On vérifie si la structure Clean Arch existe
  const isFull =
    fs.existsSync(path.join(root, "src", "auth", "application")) ||
    fs.existsSync(path.join(root, "src", "common", "domain"));
  const mode = isFull ? "full" : "light";

  // 2. Détecter l'ORM
  let orm = "prisma"; // par défaut
  if (deps["@nestjs/mongoose"] || deps["mongoose"]) {
    orm = "mongoose";
  } else if (deps["@nestjs/typeorm"] || deps["typeorm"]) {
    orm = "typeorm";
  } else if (fs.existsSync(path.join(root, "prisma"))) {
    orm = "prisma";
  }

  // 3. Détecter les options
  const hasAuth = !!(
    deps["@nestjs/passport"] || fs.existsSync(path.join(root, "src", "auth"))
  );
  const hasSwagger = !!deps["@nestjs/swagger"];
  const hasDocker =
    fs.existsSync(path.join(root, "Dockerfile")) ||
    fs.existsSync(path.join(root, "docker-compose.yml"));

  // 4. Déterminer le Gestionnaire de paquets
  const packageManager = fs.existsSync(path.join(root, "yarn.lock"))
    ? "yarn"
    : "npm";

  // 5. Détecter la DB (Approximation basée sur l'ORM ou les drivers)
  let selectedDB = "postgresql";
  if (orm === "mongoose") selectedDB = "mongodb";
  if (deps["mysql2"]) selectedDB = "mysql";

  // Construction de l'objet de configuration
  const configData = {
    name: pkg.name || "restored-project",
    mode: mode,
    orm: orm,
    database: selectedDB,
    auth: hasAuth,
    swagger: hasSwagger,
    packageManager: packageManager,
    docker: hasDocker,
    restoredAt: new Date().toISOString(),
  };

  // 6. Sauvegarde du fichier
  const configDir = path.join(root, ".nestcraftx");
  const configFile = path.join(configDir, ".nestcraftxrc");

  try {
    if (!fs.existsSync(configDir)) {
      fs.mkdirSync(configDir, { recursive: true });
    }
    fs.writeFileSync(configFile, JSON.stringify(configData, null, 2));

    logSuccess("✅ Fichier .nestcraftxrc reconstruit avec succès !");
    console.table(configData);
  } catch (error) {
    logError(
      `❌ Impossible de sauvegarder la configuration : ${error.message}`,
    );
  }
}

module.exports = generateConf;
