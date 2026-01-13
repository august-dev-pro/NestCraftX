async function helpCommand() {
  console.log(`
    ╔═══════════════════════════════════════════════════════════╗
    ║                                                           ║
    ║              🌟 NestCraftX CLI v0.2.4 🌟                  ║
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
