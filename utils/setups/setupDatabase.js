const { logInfo } = require("../loggers/logInfo");
const { runCommand } = require("../shell");
const { setupTypeORM } = require("./orms/typeOrmSetup");
const { setupMongoose } = require("./setupMongoose");
const { setupPrisma } = require("./setupPrisma");

async function setupDatabase(inputs) {
  logInfo("🚀 Configuring the database...");

  await runCommand(
    "npm install dotenv",
    "Error installing dotenv automatically, please run it manually now"
  );

  switch (inputs.selectedDB) {
    case "postgresql":
      await setupPostgres(inputs); // PostgreSQL Configuration
      break;
    case "mysql":
      await setupMySQL(inputs); // MySQL Configuration
      break;
    case "mongodb":
      await setupMongoDB(inputs); // MongoDB Configuration
      break;
    case "sqlite":
      await setupSQLite(inputs); // SQLite Configuration
      break;
    case "firebase":
      await setupFirebase(inputs); // Firebase Configuration
      break;
    case "redis":
      await setupRedis(inputs); // Redis Configuration
      break;
    default:
      throw new Error("Unsupported database.");
  }
}

async function setupMongoDB(inputs) {
  logInfo("Configuring MongoDB...");
  await setupMongoose(inputs);
}

async function setupSQLite(inputs) {
  logInfo("Configuring SQLite..."); // Calls a SQLite-specific script
  await setupSQLiteConfig(inputs);
}

async function setupMySQL(inputs) {
  logInfo("Configuring MySQL..."); // Calls a MySQL-specific script
  await setupMySQLConfig(inputs);
}

async function setupFirebase(inputs) {
  logInfo("Configuring Firebase..."); // Calls a Firebase-specific script
  await setupFirebaseConfig(inputs);
}

async function setupPostgres(inputs) {
  // Checks which ORM was chosen and calls the corresponding function
  if (inputs.dbConfig.orm === "prisma") {
    await setupPrisma(inputs);
  } else if (inputs.dbConfig.orm === "typeorm") {
    await setupTypeORM(inputs);
  } else {
    throw new Error("Unsupported ORM: " + inputs.dbConfig.orm);
  }
}

async function setupRedis(inputs) {
  logInfo("Configuring Redis..."); // Calls a Redis-specific script
  await setupRedisConfig(inputs);
}

module.exports = { setupDatabase };
