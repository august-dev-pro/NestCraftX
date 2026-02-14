#!/usr/bin/env node
const { execSync } = require("child_process");
const { parseCliArgs } = require("../utils/cliParser");

const args = parseCliArgs(process.argv);
const command = args.command || "help";

// 🔐 Forcer UTF-8 uniquement sur Windows
if (process.platform === "win32") {
  try {
    execSync("chcp 65001", { stdio: "ignore" }); // Changer l'encodage de la console
  } catch (err) {
    const message = `⚠️ Impossible de forcer UTF-8 dans le terminal Windows: ${err}`;
    console.warn(message);
  }
}

switch (command) {
  case "new":
    require("../commands/new")(args.projectName, args.flags).catch((err) => {
      console.error("❌ Erreur:", err.message);
      process.exit(1);
    });
    break;

  case "generate":
  case "g":
    require("../commands/generate")(
      args.subCommand,
      args.targetName,
      args.flags,
    ).catch((err) => {
      console.error("❌ Erreur de génération:", err.message);
      process.exit(1);
    });
    break;

  case "generate-conf":
  case "g-conf":
    require("../commands/generateConf")().catch((err) => {
      console.error("❌ Erreur de récupération:", err.message);
      process.exit(1);
    });
    break;

  case "start":
    require("../commands/start")();
    break;

  case "test":
    require("../commands/test")().catch((err) => {
      console.error("❌ Erreur:", err.message);
      process.exit(1);
    });
    break;

  case "info":
    require("../commands/info")().catch((err) => {
      console.error("❌ Erreur:", err.message);
      process.exit(1);
    });
    break;

  case "demo":
    // Passe tous les flags à la commande demo
    require("../commands/demo")(args.flags).catch((err) => {
      console.error("❌ Erreur:", err.message);
      process.exit(1);
    });
    break;

  case "--version":
  case "-v":
  case "version":
    const pkg = require("../package.json");
    console.log("NestCraftX v" + pkg.version);
    break;

  case "--help":
  case "-h":
  case "help":
  default:
    require("../commands/help")();
    break;
}
