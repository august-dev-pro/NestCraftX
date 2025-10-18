const {
  setupCleanArchitecture,
} = require("./utils/configs/setupCleanArchitecture");
const { logInfo } = require("./utils/loggers/logInfo");
const {
  createDirectory,
  /*   getTestInputs, */
  getUserInputs2,
} = require("./utils/userInput");

async function setupCleanArchitecturetest() {
  logInfo("test script");

  const inputs = await getUserInputs2();

  // const inputs = await getTestInputs();
  // creation de teste projet
  await createDirectory(inputs.projectName);

  // pointage du process vert la racine du projet
  process.chdir(inputs.projectName);

  logInfo("Génération de la structure Clean Architecture teste script");
  await setupCleanArchitecture(inputs.entitiesData);
  // console.log("user inputs: ", JSON.stringify(inputs));
}
setupCleanArchitecturetest();
