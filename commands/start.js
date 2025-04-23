const path = require("path");

// 🔐 Forcer UTF-8 uniquement sur Windows
if (process.platform === "win32") {
  try {
    execSync("chcp 65001", { stdio: "ignore" }); // Changer l'encodage de la console
  } catch (err) {
    const message = `⚠️ Impossible de forcer UTF-8 dans le terminal Windows: ${err}`;
    console.warn(message);
  }
}

module.exports = function () {
  console.log("🚀 Lancement de la génération NestJS...");

  const setupPath = path.join(__dirname, "..", "setup.js");
  require(setupPath);
};
