const path = require("path");

module.exports = function () {
  console.log("🚀 Lancement de la génération NestJS...");

  const setupPath = path.join(__dirname, "..", "setup.js");
  require(setupPath);
};
