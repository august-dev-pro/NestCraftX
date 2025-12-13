/* async function helpCommand() {
  console.log(`
  ╔═══════════════════════════════════════════════════════════╗
  ║                                                           ║
  ║              🌟 NestCraftX CLI v0.2.2 🌟                  ║
  ║          Clean Architecture Generator for NestJS          ║
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
} */

async function helpCommand() {
  console.log(`
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║              🌟 NestCraftX CLI v0.2.2 🌟                  ║
    ║          Clean Architecture Generator for NestJS          ║
    ║                                                           ║
    ╚═══════════════════════════════════════════════════════════╝

    📦 MAIN COMMANDS:

      nestcraftx new <project-name> [options]
        Creates a new NestJS project with Clean Architecture

        Options:
          --light          Quick Mode (minimal configuration)
          --orm <name>     Select the ORM (prisma|typeorm|mongoose)
          --auth           Add JWT authentication
          --swagger        Add Swagger UI
          --docker         Generate Docker files

        Examples:
          nestcraftx new my-app
          nestcraftx new blog-api --light --orm prisma --auth --swagger
          nestcraftx new shop --orm typeorm --auth

      nestcraftx demo [options]
        Generates a full demo project (blog with users, posts, comments)
        Options:
          --light          Simplified MVP Mode
          --docker         Adds Docker
          --auth           Adds JWT Auth
          --swagger        Adds Swagger UI

      nestcraftx test
        Checks system environment (Node, npm, Nest CLI, Docker, etc.)

      nestcraftx info
        Displays CLI information and features

      nestcraftx start
        Launches the interactive generator (legacy mode)

    📚 OTHER COMMANDS:

      nestcraftx --version, -v     CLI Version
      nestcraftx --help, -h        Displays this help guide

    🎯 MODES:

      Light Mode  - Quick configuration for POCs and small projects
      Full Mode   - Complete configuration with all options

    🛠️  SUPPORTED ORMS:

      • Prisma    - Modern and type-safe ORM (recommended)
      • TypeORM   - Full-featured ORM with decorators
      • Mongoose  - ODM for MongoDB

    ✨ FEATURES:

      ✅ Clean Architecture with DDD
      ✅ Repository Pattern & Use Cases
      ✅ Integrated JWT Auth
      ✅ Automatic Swagger Documentation
      ✅ Docker & Docker Compose
      ✅ Entity and Relationship Generation
      ✅ Automatic DTO Validation
      ✅ Structured Logging

    📖 Full Documentation:
       https://github.com/august-dev-pro/NestCraftX

    💬 Need help? Open an issue on GitHub!
    `);
}

module.exports = helpCommand;
