const packageJson = require("../package.json");

/* async function infoCommand() {
  console.log('\n🧱 NestCraftX v' + packageJson.version);
  console.log('Clean Architecture Generator for NestJS');
  console.log('─'.repeat(50));

  console.log('\n✅ ORMs supportés:');
  console.log('   • Prisma   - ORM moderne et type-safe');
  console.log('   • TypeORM  - ORM complet avec decorateurs');
  console.log('   • Mongoose - ODM pour MongoDB');

  console.log('\n✅ Modes disponibles:');
  console.log('   • Light - Configuration rapide pour POCs');
  console.log('   • Full  - Configuration complète et personnalisée');

  console.log('\n✅ Fonctionnalités:');
  console.log('   • Clean Architecture avec DDD');
  console.log('   • Auth JWT intégrée');
  console.log('   • Documentation Swagger');
  console.log('   • Docker & Docker Compose');
  console.log('   • Génération d\'entités automatique');
  console.log('   • Use Cases pattern');
  console.log('   • Repository pattern');

  console.log('\n📦 GitHub:');
  console.log('   ' + packageJson.repository.url);

  console.log('\n📅 Prochainement:');
  console.log('   • Middlewares personnalisés');
  console.log('   • Support microservices');
  console.log('   • Templates CI/CD');
  console.log('   • GraphQL integration');
  console.log('   • Tests automatiques');

  console.log('\n💡 Commandes disponibles:');
  console.log('   nestcraftx new <name> [options]  Créer un projet');
  console.log('   nestcraftx demo                  Projet de démo');
  console.log('   nestcraftx test                  Vérifier l\'environnement');
  console.log('   nestcraftx info                  Afficher ces informations');
  console.log('   nestcraftx --help                Aide complète');

  console.log('\n👤 Auteur: ' + packageJson.author);
  console.log('📄 Licence: ' + packageJson.license);
  console.log('');
} */

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
