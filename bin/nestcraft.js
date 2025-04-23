#!/usr/bin/env node

const [, , command] = process.argv;

switch (command) {
  case "start":
    require("../commands/start")();
    break;
  case "--help":
  case "-h":
  default:
    console.log(`
🌟 Bienvenue sur NestCraftX CLI 🌟

Usage :
  npx nestcraftx start     Génère une structure NestJS Clean Architecture

Exemples :
  npx nestcraftx start

📘 Plus de commandes à venir...
`);
    break;
}
