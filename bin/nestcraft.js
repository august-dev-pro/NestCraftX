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
    displayHelp();
    break;
}

function displayHelp() {
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                                                           ║
║           🌟 NestCraftX CLI v0.2.0-beta 🌟              ║
║     Clean Architecture Generator for NestJS              ║
║                                                           ║
╚═══════════════════════════════════════════════════════════╝

📦 COMMANDES PRINCIPALES:

  nestcraftx new <project-name> [options]
    Crée un nouveau projet NestJS avec Clean Architecture

    Options:
      --light          Mode rapide (configuration minimale)
      --orm <name>     Choisir l'ORM (prisma|typeorm|mongoose)
      --auth           Ajouter l'authentification JWT
      --swagger        Ajouter Swagger UI
      --docker         Générer les fichiers Docker

    Exemples:
      nestcraftx new my-app
      nestcraftx new blog-api --light --orm prisma --auth --swagger
      nestcraftx new shop --orm typeorm --auth

  nestcraftx demo [options]
    Génère un projet de démonstration complet (blog avec users, posts, comments)
    Options:
      --light          Mode MVP simplifié
      --docker         Ajoute Docker
      --auth           Ajoute Auth JWT
      --swagger        Ajoute Swagger UI

  nestcraftx test
    Vérifie l'environnement système (Node, npm, Nest CLI, Docker, etc.)

  nestcraftx info
    Affiche les informations sur le CLI et les fonctionnalités

  nestcraftx start
    Lance le générateur interactif (mode legacy)

📚 AUTRES COMMANDES:

  nestcraftx --version, -v     Version du CLI
  nestcraftx --help, -h        Affiche cette aide

🎯 MODES:

  Light Mode  - Configuration rapide pour POCs et petits projets
  Full Mode   - Configuration complète avec toutes les options

🛠️  ORMS SUPPORTÉS:

  • Prisma    - ORM moderne et type-safe (recommandé)
  • TypeORM   - ORM complet avec decorateurs
  • Mongoose  - ODM pour MongoDB

✨ FONCTIONNALITÉS:

  ✅ Clean Architecture avec DDD
  ✅ Repository Pattern & Use Cases
  ✅ Auth JWT intégrée
  ✅ Documentation Swagger automatique
  ✅ Docker & Docker Compose
  ✅ Génération d'entités et relations
  ✅ Validation automatique des DTOs
  ✅ Logging structuré

📖 Documentation complète:
   https://github.com/august-dev-pro/NestCraftX

💬 Besoin d'aide? Ouvre une issue sur GitHub!
`);
}
