const { logInfo } = require('../utils/loggers/logInfo');
const { logSuccess } = require('../utils/loggers/logSuccess');

async function demoCommand() {
  console.log('\n🎯 Génération du projet de démonstration...\n');

  logInfo('Configuration du projet "blog-demo"');

  const newCommand = require('./new');

  const demoInputs = {
    projectName: 'blog-demo',
    useYarn: false,
    useDocker: true,
    useAuth: true,
    useSwagger: true,
    swaggerInputs: {
      title: 'Blog Demo API',
      description: 'API de démonstration créée avec NestCraftX - Gestion de blog avec utilisateurs et posts',
      version: '1.0.0',
      endpoint: 'api/docs'
    },
    packageManager: 'npm',
    entitiesData: {
      entities: [
        {
          name: 'user',
          fields: [
            { name: 'email', type: 'string' },
            { name: 'password', type: 'string' },
            { name: 'username', type: 'string' },
            { name: 'isActive', type: 'boolean' }
          ]
        },
        {
          name: 'post',
          fields: [
            { name: 'title', type: 'string' },
            { name: 'content', type: 'string' },
            { name: 'published', type: 'boolean' },
            { name: 'authorId', type: 'string' }
          ]
        },
        {
          name: 'comment',
          fields: [
            { name: 'content', type: 'string' },
            { name: 'postId', type: 'string' },
            { name: 'authorId', type: 'string' }
          ]
        }
      ],
      relations: [
        { from: 'post', to: 'user', type: '1-n' },
        { from: 'comment', to: 'post', type: '1-n' },
        { from: 'comment', to: 'user', type: '1-n' }
      ]
    },
    selectedDB: 'postgresql',
    dbConfig: {
      orm: 'prisma',
      POSTGRES_USER: 'postgres',
      POSTGRES_PASSWORD: 'postgres',
      POSTGRES_DB: 'blog_demo',
      POSTGRES_HOST: 'localhost',
      POSTGRES_PORT: '5432'
    }
  };

  const { createProject } = require('../utils/setups/projectSetup');
  const { setupCleanArchitecture } = require('../utils/configs/setupCleanArchitecture');
  const { setupAuth } = require('../utils/setups/setupAuth');
  const { setupSwagger } = require('../utils/setups/setupSwagger');
  const { setupDatabase } = require('../utils/setups/setupDatabase');
  const { configureDocker } = require('../utils/configs/configureDocker');

  await createProject(demoInputs);
  await setupCleanArchitecture(demoInputs);
  await setupAuth(demoInputs);
  await setupSwagger(demoInputs.swaggerInputs);
  await configureDocker(demoInputs);
  await setupDatabase(demoInputs);

  console.log('\n' + '='.repeat(60));
  logSuccess('✨ Projet de démonstration créé avec succès!');
  console.log('='.repeat(60));

  console.log('\n📊 Projet "blog-demo" configuré avec:');
  console.log('   ✅ 3 Entités: User, Post, Comment');
  console.log('   ✅ Relations entre entités');
  console.log('   ✅ Auth JWT intégrée');
  console.log('   ✅ Swagger UI activé');
  console.log('   ✅ Docker & Docker Compose');
  console.log('   ✅ Prisma ORM configuré');
  console.log('   ✅ Clean Architecture complète');

  console.log('\n🚀 Pour démarrer:');
  console.log('   1. cd blog-demo');
  console.log('   2. npm run start:dev');
  console.log('   3. Ouvrir http://localhost:3000/api/docs');

  console.log('\n📚 Endpoints disponibles:');
  console.log('   • /auth/register    - Créer un compte');
  console.log('   • /auth/login       - Se connecter');
  console.log('   • /users            - Gérer les utilisateurs');
  console.log('   • /posts            - Gérer les posts');
  console.log('   • /comments         - Gérer les commentaires');

  console.log('\n💡 Astuce:');
  console.log('   Ce projet démo est prêt à l\'emploi et montre toutes');
  console.log('   les capacités de NestCraftX. Parfait pour comprendre');
  console.log('   la Clean Architecture et commencer rapidement!\n');
}

module.exports = demoCommand;
