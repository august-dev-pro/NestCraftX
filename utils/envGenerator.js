const crypto = require("crypto");
const fs = require("fs");
const path = require("path");

function generateSecret(length = 64) {
  return crypto.randomBytes(length).toString("base64url");
}

async function generateEnvFile(inputs) {
  const envVars = {
    NODE_ENV: "development",
    PORT: "3000",
    JWT_SECRET: generateSecret(64),
    JWT_REFRESH_SECRET: generateSecret(64),
    JWT_EXPIRES_IN: "15m",
    JWT_REFRESH_EXPIRES_IN: "7d",
  };

  if (inputs.dbConfig.orm === "mongoose") {
    envVars.MONGO_URI =
      inputs.dbConfig.MONGO_URI || "mongodb://localhost:27017";
    envVars.MONGO_DB = inputs.dbConfig.MONGO_DB || inputs.projectName;
  } else {
    envVars.POSTGRES_USER = inputs.dbConfig.POSTGRES_USER || "postgres";
    envVars.POSTGRES_PASSWORD = inputs.dbConfig.POSTGRES_PASSWORD || "postgres";
    envVars.POSTGRES_DB = inputs.dbConfig.POSTGRES_DB || inputs.projectName;
    envVars.POSTGRES_HOST = inputs.dbConfig.POSTGRES_HOST || "localhost";
    envVars.POSTGRES_PORT = inputs.dbConfig.POSTGRES_PORT || "5432";

    envVars.DATABASE_URL = buildDatabaseUrl(
      envVars.POSTGRES_USER,
      envVars.POSTGRES_PASSWORD,
      envVars.POSTGRES_HOST,
      envVars.POSTGRES_PORT,
      envVars.POSTGRES_DB,
      inputs.dbConfig.orm
    );
  }

  return Object.entries(envVars)
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function buildDatabaseUrl(user, password, host, port, database, orm) {
  const baseUrl = `postgresql://${user}:${password}@${host}:${port}/${database}`;

  if (orm === "prisma") {
    return `${baseUrl}?schema=public`;
  }

  return baseUrl;
}

function writeEnvFile(envContent, projectPath = ".") {
  const envPath = path.join(projectPath, ".env");
  fs.writeFileSync(envPath, envContent, "utf8");

  const envExamplePath = path.join(projectPath, ".env.example");
  const envExample = envContent
    .split("\n")
    .map((line) => {
      if (
        line.startsWith("JWT_SECRET=") ||
        line.startsWith("JWT_REFRESH_SECRET=")
      ) {
        const key = line.split("=")[0];
        return `${key}=your_secret_here`;
      }
      if (line.startsWith("POSTGRES_PASSWORD=")) {
        return "POSTGRES_PASSWORD=your_password";
      }
      return line;
    })
    .join("\n");

  fs.writeFileSync(envExamplePath, envExample, "utf8");
}

module.exports = {
  generateSecret,
  generateEnvFile,
  writeEnvFile,
  buildDatabaseUrl,
};
