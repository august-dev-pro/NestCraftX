const packageJson = require("../package.json");

async function infoCommand() {
  console.log("\n🧱 NestCraftX v" + packageJson.version);
  console.log("Clean Architecture Generator for NestJS");
  console.log("─".repeat(50));

  console.log("\n✅ Supported ORMs:");
  console.log("   • Prisma   - Modern and type-safe ORM");
  console.log("   • TypeORM  - Full-featured ORM with decorators");
  console.log("   • Mongoose - ODM for MongoDB");

  console.log("\n✅ Available Modes:");
  console.log("   • Light - Quick setup for POCs");
  console.log("   • Full  - Complete and customized configuration");

  console.log("\n✅ Key Features:");
  console.log("   • Clean Architecture with DDD");
  console.log("   • Integrated JWT Auth");
  console.log("   • Swagger Documentation");
  console.log("   • Docker & Docker Compose");
  console.log("   • Automatic Entity Generation");
  console.log("   • Use Cases pattern");
  console.log("   • Repository pattern");

  console.log("\n📦 GitHub:");
  console.log("   " + packageJson.repository.url);

  console.log("\n📅 Upcoming:");
  console.log("   • Custom Middlewares");
  console.log("   • Microservices support");
  console.log("   • CI/CD Templates");
  console.log("   • GraphQL integration");
  console.log("   • Automated Tests");

  console.log("\n💡 Available Commands:");
  console.log("   nestcraftx new <name> [options]  Create a project");
  console.log("   nestcraftx demo                  Generate a demo project");
  console.log("   nestcraftx test                  Check environment status");
  console.log("   nestcraftx info                  Display this information");
  console.log("   nestcraftx --help                Complete help guide");

  console.log("\n👤 Author: " + packageJson.author);
  console.log("📄 License: " + packageJson.license);
  console.log("");
}

module.exports = infoCommand;
