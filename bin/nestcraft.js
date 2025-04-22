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
🌟 Bienvenue sur NestCraft CLI 🌟

Usage :
  npx nestcraft start     Génère une structure NestJS Clean Architecture

Exemples :
  npx nestcraft start

📘 Plus de commandes à venir...
`);
    break;
}
