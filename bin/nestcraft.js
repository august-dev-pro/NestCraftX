#!/usr/bin/env node

const { parseCliArgs } = require("../utils/cliParser");

const args = parseCliArgs(process.argv);
const command = args.command || "help";

switch (command) {
  case "new":
    require("../commands/new")(args.projectName, args.flags).catch((err) => {
      console.error("❌ Erreur:", err.message);
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
