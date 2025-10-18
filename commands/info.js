const packageJson = require('../package.json');

async function infoCommand() {
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
}

module.exports = infoCommand;
