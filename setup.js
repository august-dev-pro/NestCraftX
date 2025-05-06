const { execSync } = require("child_process");
const { getUserInputs, getUserInputs2 } = require("./utils/userInput");
const { configureDocker } = require("./utils/configs/configureDocker");
const {
  setupCleanArchitecture,
} = require("./utils/configs/setupCleanArchitecture");
const { logSuccess } = require("./utils/loggers/logSuccess");
const { createProject } = require("./utils/setups/projectSetup");
// const { setupPrisma } = require("./utils/setups/setupPrisma");
const { setupAuth } = require("./utils/setups/setupAuth");
const { setupSwagger } = require("./utils/setups/setupSwagger");
const { setupDatabase } = require("./utils/setups/setupDatabase");
const { setupBootstrapLogger } = require("./utils/setups/setupLogger");

async function main() {
  const inputs = await getUserInputs2();

  await createProject(inputs);
  await setupCleanArchitecture(inputs);

  if (inputs.useAuth) await setupAuth(inputs);
  if (inputs.useSwagger) {
    await setupSwagger(inputs.swaggerInputs);
  } else {
    setupBootstrapLogger();
  }
  if (inputs.useDocker) await configureDocker(inputs);

  // await setupPrisma(inputs);

  // Sélection dynamique du script de configuration BDD
  await setupDatabase(inputs);
  logSuccess(`Projet ${inputs.projectName} configuré avec succès!`);
  console.log(
    `\n🚀 Pour commencer :\n  cd ${inputs.projectName}\n  ${inputs.packageManager} run start:dev`
  );
}

main();
