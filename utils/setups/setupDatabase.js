const { logInfo } = require("../loggers/logInfo");
const { runCommand } = require("../shell");
const { setupTypeORM } = require("./orms/typeOrmSetup");
const { setupPrisma } = require("./setupPrisma");

async function setupDatabase(inputs) {
  logInfo("🚀 Configuration de la base de données...");

  await runCommand(
    "npm install dotenv",
    "error instal dotenv automaticly, run it manuealy now"
  );

  switch (inputs.selectedDB) {
    case "postgresql":
      await setupPostgres(inputs); // Configuration PostgreSQL
      break;
    case "mysql":
      await setupMySQL(inputs); // Configuration MySQL
      break;
    case "mongodb":
      await setupMongoDB(inputs); // Configuration MongoDB
      break;
    case "sqlite":
      await setupSQLite(inputs); // Configuration SQLite
      break;
    case "firebase":
      await setupFirebase(inputs); // Configuration Firebase
      break;
    case "redis":
      await setupRedis(inputs); // Configuration Firebase
      break;
    default:
      throw new Error("Base de données non supportée.");
  }
}
async function setupMongoDB(inputs) {
  logInfo("Configuration de MongoDB...");
  // Appelle un script spécifique à MongoDB
  // await setupMongoDBConfig(inputs);
}
async function setupSQLite(inputs) {
  logInfo("Configuration de SQLite...");
  // Appelle un script spécifique à SQLite
  await setupSQLiteConfig(inputs);
}
async function setupMySQL(inputs) {
  logInfo("Configuration de MySQL...");
  // Appelle un script spécifique à MySQL
  await setupMySQLConfig(inputs);
}
async function setupFirebase(inputs) {
  logInfo("Configuration de Firebase...");
  // Appelle un script spécifique à Firebase
  await setupFirebaseConfig(inputs);
}
async function setupPostgres(inputs) {
  // Vérifie quel ORM a été choisi et appelle la fonction correspondante
  if (inputs.dbConfig.orm === "prisma") {
    await setupPrisma(inputs);
  } else if (inputs.dbConfig.orm === "typeorm") {
    await setupTypeORM(inputs);
  } else {
    throw new Error("orm non suporter: ", inputs.dbConfig.orm);
  }
}
async function setupRedis(inputs) {
  logInfo("Configuration de Redis...");
  // Appelle un script spécifique à Redis
  await setupRedisConfig(inputs);
}

module.exports = { setupDatabase };
