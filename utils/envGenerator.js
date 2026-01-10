const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString("base64url");
}

async function generateEnvFile(inputs) {
  const jwtSecret = generateSecret(64);
  const jwtRefreshSecret = generateSecret(64);

  // --- SECTION APPLICATION ---
  let content = `# ==============================================================================
# APPLICATION CONFIGURATION
# ==============================================================================
# development | production | test
NODE_ENV=development
PORT=3000

`;

  // --- SECTION AUTHENTIFICATION ---
  content += `# ------------------------------------------------------------------------------
# AUTHENTICATION (JWT)
# ------------------------------------------------------------------------------
# Secrets auto-générés pour sécuriser les tokens.
# Ne partagez jamais ces clés en production.
JWT_SECRET=${jwtSecret}
JWT_REFRESH_SECRET=${jwtRefreshSecret}

# Formats acceptés : 15m (minutes), 1h (heures), 7d (jours)
JWT_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d

`;

  // --- SECTION DATABASE ---
  content += `# ------------------------------------------------------------------------------
# DATABASE CONFIGURATION (${inputs.dbConfig.orm.toUpperCase()})
# ------------------------------------------------------------------------------
`;

  if (inputs.dbConfig.orm === "mongoose") {
    const mongoUri = inputs.dbConfig.MONGO_URI || "mongodb://localhost:27017";
    const mongoDb = inputs.dbConfig.MONGO_DB || inputs.projectName;
    content += `# URI de connexion MongoDB
MONGO_URI=${mongoUri}
MONGO_DB=${mongoDb}
`;
  } else {
    const user = inputs.dbConfig.POSTGRES_USER || "postgres";
    const pass = inputs.dbConfig.POSTGRES_PASSWORD || "postgres";
    const db = inputs.dbConfig.POSTGRES_DB || inputs.projectName;
    const host = inputs.dbConfig.POSTGRES_HOST || "localhost";
    const port = inputs.dbConfig.POSTGRES_PORT || "5432";

    const dbUrl = buildDatabaseUrl(
      user,
      pass,
      host,
      port,
      db,
      inputs.dbConfig.orm
    );

    content += `# Variables individuelles (utiles pour Docker ou scripts tiers)
POSTGRES_USER=${user}
POSTGRES_PASSWORD=${pass}
POSTGRES_DB=${db}
POSTGRES_HOST=${host}
POSTGRES_PORT=${port}

# URL de connexion complète utilisée par ${inputs.dbConfig.orm.toUpperCase()}
DATABASE_URL=${dbUrl}
`;
  }

  return content;
}

function buildDatabaseUrl(user, password, host, port, database, orm) {
  const baseUrl = `postgresql://${user}:${password}@${host}:${port}/${database}`;
  return orm === "prisma" ? `${baseUrl}?schema=public` : baseUrl;
}

function writeEnvFile(envContent, projectPath = ".") {
  // Écriture du .env (avec secrets)
  const envPath = path.join(projectPath, ".env");
  fs.writeFileSync(envPath, envContent, "utf8");

  // Génération du .env.example (sans secrets pour le Git)
  const envExample = envContent
    .split("\n")
    .map((line) => {
      if (
        line.includes("JWT_SECRET=") ||
        line.includes("JWT_REFRESH_SECRET=")
      ) {
        return line.split("=")[0] + "=votre_cle_secrete_ici";
      }
      if (line.includes("POSTGRES_PASSWORD=")) {
        return "POSTGRES_PASSWORD=votre_mot_de_passe";
      }
      if (line.includes("DATABASE_URL=")) {
        // Masquer le mot de passe dans l'URL d'exemple
        return "DATABASE_URL=postgresql://user:password@localhost:5432/db_name?schema=public";
      }
      return line;
    })
    .join("\n");

  const envExamplePath = path.join(projectPath, ".env.example");
  fs.writeFileSync(envExamplePath, envExample, "utf8");
}

module.exports = {
  generateSecret,
  generateEnvFile,
  writeEnvFile,
  buildDatabaseUrl,
};
