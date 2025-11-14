// setupTypeORM.js
// const { execSync } = require("child_process");
// const path = require("path");
// const { runCommand } = require("../shell");

const {
  updateFile,
  capitalize,
  createFile,
  createDirectory,
} = require("../../userInput");
const { logInfo } = require("../../loggers/logInfo");
const { logSuccess } = require("../../loggers/logSuccess");
const path = require("path");
const { runCommand } = require("../../shell");

async function setupTypeORM(inputs) {
  logInfo("📦 Installation de TypeORM et des dépendances PostgreSQL...");
  runCommand(
    "npm install @nestjs/typeorm typeorm pg reflect-metadata",
    "TypeORM et les dependances PostgreSQL installer avec succes"
  );

  const dbConfig = inputs.dbConfig;

  // Création du fichier .env avec les valeurs dynamiques
  const envContent = `
DB_HOST=${dbConfig.POSTGRES_HOST}
DB_PORT=${dbConfig.POSTGRES_PORT}
DB_USERNAME=${dbConfig.POSTGRES_USER}
DB_PASSWORD=${dbConfig.POSTGRES_PASSWORD}
DB_DATABASE=${dbConfig.POSTGRES_DB}
  `.trim();
  await createFile({
    path: ".env",
    contente: envContent,
  });

  // Mise à jour de app.module.ts avec TypeORM
  const appModulePath = "src/app.module.ts";
  const typeOrmImport = `import { TypeOrmModule } from '@nestjs/typeorm';`;
  const typeOrmConfig = `
TypeOrmModule.forRoot({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: process.env.DB_PORT ? parseInt(process.env.DB_PORT, 10) : 5432,
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DATABASE,
  autoLoadEntities: true,
  synchronize: true,
}),`;

  logInfo("⚙️ Mise à jour de app.module.ts avec TypeORM...");
  await updateFile({
    path: appModulePath,
    pattern: `ConfigModule.forRoot({
      isGlobal: true, // Rendre ConfigModule accessible globalement
      envFilePath: '.env', // Charger les variables d'environnement
    }),`,
    replacement: ` ConfigModule.forRoot({
      isGlobal: true, // Rendre ConfigModule accessible globalement
      envFilePath: '.env', // Charger les variables d'environnement
    }),
    ${typeOrmConfig}`,
  });

  await updateFile({
    path: appModulePath,
    pattern: "import { Module } from '@nestjs/common';",
    replacement: `import { Module } from '@nestjs/common';
        ${typeOrmImport}`,
  });

  // Génération des entités
  logInfo("📁 Génération des entités à typeorm...");

  await createDirectory("src/entities");

  for (const entity of inputs.entitiesData.entities) {
    const entityName = capitalize(entity.name);
    const fields = entity.fields
      .map((field) => {
        const decorators = ["@Column()"];
        if (field.name === "id")
          decorators.unshift("@PrimaryGeneratedColumn()");
        return `${decorators.join("\n  ")}\n  ${field.name}: ${field.type};`;
      })
      .join("\n\n  ");

    const content = `import { Entity, Column, PrimaryGeneratedColumn } from 'typeorm';

@Entity('${entity.name}')
export class ${entityName} {
  @PrimaryGeneratedColumn('uuid') // ou 'increment'
  id: string;

  ${fields}
}`;

    await createFile({
      path: `src/entities/${entityName}.entity.ts`,
      contente: content,
    });
  }

  // Création de la base de données PostgreSQL
  try {
    logInfo("🛠️ Création de la base de données PostgreSQL...");
    runCommand(
      `set PGPASSWORD=${dbConfig.POSTGRES_PASSWORD} && psql -U ${dbConfig.POSTGRES_USER} -h ${dbConfig.POSTGRES_HOST} -p ${dbConfig.POSTGRES_PORT} -c "CREATE DATABASE ${dbConfig.POSTGRES_DB};"`,
      "base de données PostgreSQL creer avec succes"
    );
  } catch (error) {
    console.warn(
      "⚠️ Impossible de créer la base (elle existe peut-être déjà)."
    );
  }

  if (inputs.isDemo) {
    await setupTypeOrmSeeding(inputs);
  }

  logSuccess("✅ Configuration TypeORM terminée. Prêt à coder !");
}
async function setupTypeOrmSeeding(inputs) {
  logInfo("⚙️ Configuration du seeding pour TypeORM...");

  // --- Dépendances ---
  const typeOrmDevDeps = [
    "ts-node",
    "@types/node",
    "@types/bcrypt",
    "typeorm-extension",
  ];
  await runCommand(
    `${inputs.packageManager} add -D ${typeOrmDevDeps.join(" ")}`,
    "❌ Échec de l'installation des dépendances de seeding TypeORM"
  );
  await runCommand(
    `${inputs.packageManager} install bcrypt`,
    "❌ Échec de l'installation de bcrypt"
  );

  // --- Scripts dans package.json ---
  const typeOrmScripts = {
    // Commande TypeORM standard pour lancer les migrations et les seeders
    "typeorm:migrate:run":
      "typeorm-ts-node-commonjs migration:run -d ./src/database/typeorm.config.ts",
    "typeorm:seed":
      "typeorm-extension seed -d ./src/database/typeorm.config.ts",
    seed: `${inputs.packageManager} run typeorm:seed`,
  };
  await updatePackageJson(inputs, typeOrmScripts);

  // --- Création de la structure et du Seeder ---
  await createDirectory("src/database/seeders");

  const userSeederContent = generateTypeOrmSeederContent(
    inputs.entitiesData.entities
  ); // Supposons une fonction de génération
  await createFile({
    path: `src/database/seeders/UserSeeder.ts`,
    content: userSeederContent,
  });

  logSuccess("✅ Seeding TypeORM configuré.");
}
function generateTypeOrmSeederContent() {
  return `
import { DataSource } from 'typeorm';
import { User } from '../src/modules/user/entities/user.entity';
import { Post } from '../src/modules/post/entities/post.entity';
import { Comment } from '../src/modules/comment/entities/comment.entity';
import * as bcrypt from 'bcrypt';

export class DemoSeeder {
  constructor(private dataSource: DataSource) {}

  async run() {
    console.log('🌱 Démarrage du seeding TypeORM...');

    const userRepository = this.dataSource.getRepository(User);
    const postRepository = this.dataSource.getRepository(Post);
    const commentRepository = this.dataSource.getRepository(Comment);

    // --- 1. ADMIN ---
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash('password123', salt);

    const admin = userRepository.create({
      email: 'admin@nestcraft.com',
      password: hashedPassword,
      username: 'NestCraftAdmin',
      isActive: true,
    });
    await userRepository.save(admin);
    console.log('👑 Admin créé');

    // --- 2. UTILISATEURS DEMO ---
    const demoUsersData = [
      { email: 'emma.jones@demo.com', password: hashedPassword, username: 'EmmaJones', isActive: true },
      { email: 'lucas.martin@demo.com', password: hashedPassword, username: 'LucasMartin', isActive: true },
      { email: 'sophia.bernard@demo.com', password: hashedPassword, username: 'SophiaBernard', isActive: true },
      { email: 'alexandre.dubois@demo.com', password: hashedPassword, username: 'AlexandreDubois', isActive: true },
      { email: 'chloe.moreau@demo.com', password: hashedPassword, username: 'ChloeMoreau', isActive: true },
    ];

    const users = await userRepository.save(demoUsersData);
    console.log(\`👥 \${users.length} utilisateurs démo créés.\`);

    const allUsers = [admin, ...users];

    // --- 3. POSTS DEMO ---
    const postsData = [
      {
        title: 'Les bases de NestJS pour les développeurs modernes',
        content: 'Découvrez comment construire une API robuste et maintenable avec NestJS...',
        published: true,
        author: allUsers[1],
      },
      {
        title: 'Comment sécuriser votre API avec JWT',
        content: 'L’authentification JWT est un standard pour sécuriser les APIs...',
        published: true,
        author: allUsers[2],
      },
      {
        title: 'Optimiser les performances d’une API Node.js',
        content: 'Découvrez les meilleures pratiques pour améliorer les performances...',
        published: true,
        author: allUsers[3],
      },
      {
        title: 'Introduction à Prisma ORM',
        content: 'Prisma est un ORM moderne qui simplifie les interactions avec la base de données...',
        published: true,
        author: allUsers[4],
      },
      {
        title: 'Comprendre la Clean Architecture',
        content: 'La Clean Architecture permet de séparer la logique métier du reste du code...',
        published: false,
        author: allUsers[0],
      },
    ];

    const posts = await postRepository.save(postsData);
    console.log(\`📝 \${posts.length} articles créés.\`);

    // --- 4. COMMENTAIRES DEMO ---
    const commentsData = [
      {
        content: 'Excellent article ! J’ai pu appliquer ces conseils directement sur mon projet NestJS.',
        post: posts[0],
        author: allUsers[2],
      },
      {
        content: 'Très clair et bien expliqué, merci pour le partage sur Prisma 👏',
        post: posts[3],
        author: allUsers[0],
      },
      {
        content: 'Je ne connaissais pas JWT avant cet article, c’est une vraie révélation.',
        post: posts[1],
        author: allUsers[4],
      },
      {
        content: 'La Clean Architecture m’a toujours paru floue, cet article m’a enfin éclairé.',
        post: posts[4],
        author: allUsers[1],
      },
      {
        content: 'Merci pour ce contenu ! J’aimerais voir un tutoriel complet avec NestJS + Prisma.',
        post: posts[2],
        author: allUsers[3],
      },
    ];

    const comments = await commentRepository.save(commentsData);
    console.log(\`💬 \${comments.length} commentaires créés.\`);

    console.log('✅ Seeding TypeORM terminé avec succès ! 🚀');
  }
}

// Script d’exécution directe
import { AppDataSource } from '../src/config/data-source';

AppDataSource.initialize()
  .then(async (dataSource) => {
    const seeder = new DemoSeeder(dataSource);
    await seeder.run();
    await dataSource.destroy();
  })
  .catch((error) => {
    console.error('❌ Erreur lors du seeding TypeORM:', error);
    process.exit(1);
  });
`;
}

module.exports = { setupTypeORM };
