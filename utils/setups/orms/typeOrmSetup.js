// setupTypeORM.js
// const { execSync } = require("child_process");
// const path = require("path");
// const { runCommand } = require("../shell");

const {
  updateFile,
  capitalize,
  createFile,
  createDirectory,
  decapitalize,
} = require("../../userInput");
const { logInfo } = require("../../loggers/logInfo");
const { logSuccess } = require("../../loggers/logSuccess");
const path = require("path");
const { runCommand } = require("../../shell");

async function setupTypeORM(inputs) {
  logInfo("📦 Installing TypeORM and PostgreSQL dependencies..."); // Utiliser runCommand avec 'await' et vérifier le résultat si possible, // ou s'assurer que 'runCommand' gère l'async/await correctement en interne.
  await runCommand(
    "npm install @nestjs/typeorm typeorm pg reflect-metadata",
    "TypeORM and PostgreSQL dependencies installed successfully"
  ); // Updating app.module.ts with TypeORM

  const appModulePath = "src/app.module.ts";
  const typeOrmImport = `import { TypeOrmModule } from '@nestjs/typeorm';`;
  const typeOrmConfig = `
    TypeOrmModule.forRoot({
        type: 'postgres',
        host: process.env.POSTGRES_HOST,
        port: process.env.POSTGRES_PORT
          ? parseInt(process.env.POSTGRES_PORT, 10)
          : 5432,
        username: process.env.POSTGRES_USER,
        password: process.env.POSTGRES_PASSWORD,
        database: process.env.POSTGRES_DB,
        autoLoadEntities: true, // Reinstated for automatic loading of entities registered in .forFeature
        synchronize: true, // Only for dev use!
        // dropSchema: true, //// ⚠️ wipes the entire schema on every restart! Only for dev use!
      }),`;

  logInfo("⚙️ Updating app.module.ts with TypeORM..."); // 1. Updating TypeOrmModule.forRoot()
  await updateFile({
    path: appModulePath,
    pattern: `ConfigModule.forRoot({
        isGlobal: true, // Make ConfigModule globally accessible
        envFilePath: '.env', // Load environment variables
      }),`,
    replacement: ` ConfigModule.forRoot({
        isGlobal: true, // Make ConfigModule globally accessible
        envFilePath: '.env', // Load environment variables
      }),
      ${typeOrmConfig}`,
  }); // 2. Adding TypeOrmModule import

  await updateFile({
    path: appModulePath,
    pattern: "import { Module } from '@nestjs/common';",
    replacement: `import { Module } from '@nestjs/common';
          ${typeOrmImport}`,
  }); // Entity Generation

  logInfo("📁 Generating entities for TypeORM...");

  await createDirectory("src/entities");

  for (const entity of inputs.entitiesData.entities) {
    const entityName = capitalize(entity.name);
    const entityNameLower = decapitalize(entity.name);
    let fieldsContent = "";
    let relationsContent = "";
    let imports = [
      "Entity",
      "Column",
      "PrimaryGeneratedColumn",
      "CreateDateColumn",
      "UpdateDateColumn",
    ];
    let extraImports = ""; // --- Basic Data Field Generation Logic --- // Filtering to avoid duplication of relationship fields

    const relationFields = inputs.entitiesData.relations
      .reduce((acc, rel) => {
        // Foreign key and relation name (Many side)
        if (
          rel.from.toLowerCase() === entityNameLower &&
          ["n-1", "1-1"].includes(rel.type)
        ) {
          acc.push(`${rel.to}Id`, rel.to);
        }
        if (
          rel.to.toLowerCase() === entityNameLower &&
          ["1-n", "1-1"].includes(rel.type)
        ) {
          acc.push(`${rel.from}Id`, rel.from);
        } // List name (One side)
        if (rel.from.toLowerCase() === entityNameLower && rel.type === "1-n") {
          acc.push(`${rel.to}s`);
        }
        if (rel.to.toLowerCase() === entityNameLower && rel.type === "n-1") {
          acc.push(`${rel.from}s`);
        } // For 1-1
        if (rel.type === "1-1") {
          // We manage both sides, ensure only one has the foreign key
          // We just exclude model names that will become relations
          acc.push(rel.from, rel.to);
        }
        return acc;
      }, [])
      .map((f) => f.toLowerCase()); /* for (const field of entity.fields) {
        // We ignore fields if we know they will be managed by the relationship logic
        if (!relationFields.includes(field.name.toLowerCase())) {
          const type = mapTypeToTypeORM(field.type);
          fieldsContent += `
      @Column({ type: '${type}' })
      ${field.name}: ${field.type};
  `;
        }
      } */

    for (const field of entity.fields) {
      // We ignore fields if we know they will be managed by the relationship logic
      if (!relationFields.includes(field.name.toLowerCase())) {
        const mapping = mapTypeToTypeORM(field.type); // 🚨 Use the new mapping // Building the options object (including array: true, enum, etc.)

        let columnOptions = `type: '${mapping.type}'`; // Adding specific options (like array: true or enum: MyEnum)

        if (mapping.options) {
          columnOptions += `, ${mapping.options}`;
        } // Adding import for custom Enums/Types

        if (
          mapping.type === "enum" ||
          mapping.tsType.charAt(0) === mapping.tsType.charAt(0).toUpperCase()
        ) {
          extraImports += `\nimport { ${mapping.tsType} } from '../shared/enums/${mapping.tsType}.enum';`; // Assumption of path for Enums
        }

        fieldsContent += `
              @Column({ ${columnOptions} })
              ${field.name}: ${mapping.tsType};
          `;
      }
    } // --- TypeORM Relation Generation Logic ---

    for (const relation of inputs.entitiesData.relations) {
      const relFrom = relation.from;
      const relTo = relation.to;
      const relType = relation.type;

      if (relType === "1-n") {
        // If the current entity is on the 'One' side (relFrom), it holds the @OneToMany
        if (relFrom.toLowerCase() === entityNameLower) {
          const targetEntity = capitalize(relTo);
          relationsContent += `
      @OneToMany(() => ${targetEntity}, (${decapitalize(
            relTo
          )}) => ${decapitalize(relTo)}.${relFrom.toLowerCase()})
      ${relTo.toLowerCase()}s: ${targetEntity}[];
  `;
          imports.push("OneToMany");
          extraImports += `\nimport { ${targetEntity} } from './${targetEntity}.entity';`;
        } // If the current entity is on the 'Many' side (relTo), it holds the @ManyToOne
        else if (relTo.toLowerCase() === entityNameLower) {
          const targetEntity = capitalize(relFrom);
          const fkName = `${relFrom.toLowerCase()}Id`;
          relationsContent += `
      @Column({ type: 'uuid' }) // Foreign Key
      ${fkName}: string;

      @ManyToOne(() => ${targetEntity}, (${decapitalize(
            relFrom
          )}) => ${decapitalize(relFrom)}.${relTo.toLowerCase()}s)
      ${relFrom.toLowerCase()}: ${targetEntity};
  `;
          imports.push("ManyToOne");
          extraImports += `\nimport { ${targetEntity} } from './${targetEntity}.entity';`;
        }
      } else if (relType === "n-1") {
        // n-1 is the inverse: relFrom is the 'Many', relTo is the 'One'

        // If the current entity is on the 'Many' side (relFrom), it holds the @ManyToOne
        if (relFrom.toLowerCase() === entityNameLower) {
          const targetEntity = capitalize(relTo);
          const fkName = `${relTo.toLowerCase()}Id`;
          relationsContent += `
      @Column({ type: 'uuid' }) // Foreign Key
      ${fkName}: string;

      @ManyToOne(() => ${targetEntity}, (${decapitalize(
            relTo
          )}) => ${decapitalize(relTo)}.${relFrom.toLowerCase()}s)
      ${relTo.toLowerCase()}: ${targetEntity};
  `;
          imports.push("ManyToOne");
          extraImports += `\nimport { ${targetEntity} } from './${targetEntity}.entity';`;
        } // If the current entity is on the 'One' side (relTo), it holds the @OneToMany
        else if (relTo.toLowerCase() === entityNameLower) {
          const targetEntity = capitalize(relFrom);
          relationsContent += `
      @OneToMany(() => ${targetEntity}, (${decapitalize(
            relFrom
          )}) => ${decapitalize(relFrom)}.${relTo.toLowerCase()})
      ${relFrom.toLowerCase()}s: ${targetEntity}[];
  `;
          imports.push("OneToMany");
          extraImports += `\nimport { ${targetEntity} } from './${targetEntity}.entity';`;
        }
      }
      if (relType === "1-1") {
        // If the current entity is on the 'from' side, it holds the @OneToOne and the foreign key
        if (relFrom.toLowerCase() === entityNameLower) {
          const targetEntity = capitalize(relTo);
          const fkName = `${relTo.toLowerCase()}Id`;

          relationsContent += `
    @Column({ type: 'uuid', unique: true }) // Unique foreign key for 1-1
    ${fkName}: string;

    @OneToOne(() => ${targetEntity}, (${decapitalize(relTo)}) => ${decapitalize(
            relTo
          )}.${relFrom.toLowerCase()})
    @JoinColumn({ name: '${fkName}' }) // Requires JoinColumn for the foreign key
    ${relTo.toLowerCase()}: ${targetEntity};
  `;
          imports.push("OneToOne", "JoinColumn");
          extraImports += `\nimport { ${targetEntity} } from './${targetEntity}.entity';`;
        } // If the current entity is on the 'to' side, it holds the inverse @OneToOne relationship (mapping)
        else if (relTo.toLowerCase() === entityNameLower) {
          const targetEntity = capitalize(relFrom);
          relationsContent += `
    @OneToOne(() => ${targetEntity}, (${decapitalize(
            relFrom
          )}) => ${decapitalize(relFrom)}.${relTo.toLowerCase()})
    ${relFrom.toLowerCase()}: ${targetEntity};
  `;
          imports.push("OneToOne");
          extraImports += `\nimport { ${targetEntity} } from './${targetEntity}.entity';`;
        }
      } else if (relType === "n-n") {
        const targetEntity = capitalize(
          relFrom.toLowerCase() === entityNameLower ? relTo : relFrom
        );
        const currentSide =
          relFrom.toLowerCase() === entityNameLower ? relTo : relFrom;
        const otherSide =
          relFrom.toLowerCase() === entityNameLower ? relFrom : relTo; // TypeORM requires JoinTable on one side (we choose the 'from' side for simplicity)

        if (relFrom.toLowerCase() === entityNameLower) {
          relationsContent += `
    @ManyToMany(() => ${targetEntity}, (${decapitalize(
            currentSide
          )}) => ${decapitalize(currentSide)}.${otherSide.toLowerCase()}s)
    @JoinTable() // Adding JoinTable to create the junction table
    ${currentSide.toLowerCase()}s: ${targetEntity}[];
  `;
          imports.push("ManyToMany", "JoinTable");
        } else {
          relationsContent += `
    @ManyToMany(() => ${targetEntity}, (${decapitalize(
            currentSide
          )}) => ${decapitalize(currentSide)}.${otherSide.toLowerCase()}s)
    ${currentSide.toLowerCase()}s: ${targetEntity}[];
  `;
          imports.push("ManyToMany");
        }
        extraImports += `\nimport { ${targetEntity} } from './${targetEntity}.entity';`;
      }
    } // --- Final File Generation ---

    const uniqueImports = Array.from(new Set(imports)).join(", ");

    const content = `${extraImports}
  import { ${uniqueImports} } from 'typeorm';

  @Entity('${entityNameLower}')
  export class ${entityName} {
      @PrimaryGeneratedColumn('uuid')
      id: string;

      @CreateDateColumn()
      createdAt: Date;

      @UpdateDateColumn()
      updatedAt: Date;

  ${fieldsContent}
  ${relationsContent}
  }`;

    await createFile({
      path: `src/entities/${entityName}.entity.ts`,
      contente: content,
    });
  }

  if (inputs.isDemo) {
    await setupTypeOrmSeeding(inputs);
  }

  logSuccess("✅ TypeORM configuration complete. Ready to code!");
}

/**
 * Maps entity types to TypeORM column types (PostgreSQL).
 * @param type The input type (string, number, boolean, Date, enum, array, etc.)
 * @returns { object: type, tsType: string } The mapping information
 */
function mapTypeToTypeORM(type) {
  // Special case for arrays (e.g., 'string[]')
  if (type.endsWith("[]")) {
    const innerType = type.slice(0, -2);
    const innerMapping = mapTypeToTypeORM(innerType); // Recursive
    return {
      type: innerMapping.type,
      tsType: `${innerMapping.tsType}[]`,
      options: "array: true", // TypeORM option for arrays
    };
  }

  const typeLower = type.toLowerCase();

  switch (typeLower) {
    case "string":
      return { type: "varchar", tsType: "string" };
    case "text":
      return { type: "text", tsType: "string" };
    case "number": // We must be generic, float is safer
    case "float":
      return { type: "float", tsType: "number" };
    case "int":
      return { type: "integer", tsType: "number" };
    case "decimal":
      return { type: "decimal", tsType: "number" };
    case "uuid":
      return { type: "uuid", tsType: "string" };
    case "date":
      return { type: "timestamp", tsType: "Date" };
    case "boolean":
      return { type: "boolean", tsType: "boolean" };
    case "json":
    case "object":
      return { type: "jsonb", tsType: "any" }; // JSONB type is flexible

    default: // Case of an Enum type or a named object (e.g., 'Address')
      // By default, we assume it's an enum to be stored in the database (varchar)
      if (type.charAt(0) === type.charAt(0).toUpperCase()) {
        // For Enums, TypeORM needs the 'enum' and 'enumName' option
        return {
          type: "enum",
          tsType: type, // The name of the Enum/object in TypeScript
          options: `enum: ${type}, enumName: '${type.toLowerCase()}_enum'`, // Example of enum options
        };
      }
      return { type: "varchar", tsType: "string" };
  }
}

async function setupTypeOrmSeeding(inputs) {
  logInfo("⚙️ Configuring seeding for TypeORM..."); // --- Dependencies ---

  const typeOrmDevDeps = [
    "ts-node",
    "@types/node",
    "@types/bcrypt",
    "typeorm-extension",
  ];

  await runCommand(
    `${inputs.packageManager} add -D ${typeOrmDevDeps.join(" ")}`,
    "❌ Failed to install TypeORM seeding dependencies"
  );

  await runCommand(
    `${inputs.packageManager} install bcrypt`,
    "❌ Failed to install bcrypt"
  ); // --- Scripts in package.json ---

  const typeOrmScripts = {
    // Standard TypeORM command to run migrations and seeders
    "typeorm:migrate:run":
      "typeorm-ts-node-commonjs migration:run -d ./src/database/typeorm.config.ts",
    "typeorm:seed":
      "typeorm-extension seed -d ./src/database/typeorm.config.ts",
    seed: `${inputs.packageManager} run typeorm:seed`,
  };
  await updatePackageJson(inputs, typeOrmScripts); // --- Creating structure and Seeder ---

  await createDirectory("src/database/seeders");

  const userSeederContent = generateTypeOrmSeederContent(
    inputs.entitiesData.entities
  ); // Assuming a generation function
  await createFile({
    path: `src/database/seeders/UserSeeder.ts`,
    content: userSeederContent,
  });

  logSuccess("✅ TypeORM seeding configured.");
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
      console.log('🌱 Starting TypeORM seeding...');

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
      console.log('👑 Admin user created');

      // --- 2. DEMO USERS ---
      const demoUsersData = [
        { email: 'emma.jones@demo.com', password: hashedPassword, username: 'EmmaJones', isActive: true },
        { email: 'lucas.martin@demo.com', password: hashedPassword, username: 'LucasMartin', isActive: true },
        { email: 'sophia.bernard@demo.com', password: hashedPassword, username: 'SophiaBernard', isActive: true },
        { email: 'alexandre.dubois@demo.com', password: hashedPassword, username: 'AlexandreDubois', isActive: true },
        { email: 'chloe.moreau@demo.com', password: hashedPassword, username: 'ChloeMoreau', isActive: true },
      ];

      const users = await userRepository.save(demoUsersData);
      console.log(\`👥 \${users.length} demo users created.\`);

      const allUsers = [admin, ...users];

      // --- 3. DEMO POSTS ---
      const postsData = [
        {
          title: 'The Basics of NestJS for Modern Developers',
          content: 'Discover how to build a robust and maintainable API with NestJS...',
          published: true,
          author: allUsers[1],
        },
        {
          title: 'How to Secure Your API with JWT',
          content: 'JWT authentication is a standard for securing APIs...',
          published: true,
          author: allUsers[2],
        },
        {
          title: 'Optimizing Node.js API Performance',
          content: 'Discover best practices for improving performance...',
          published: true,
          author: allUsers[3],
        },
        {
          title: 'Introduction to Prisma ORM',
          content: 'Prisma is a modern ORM that simplifies interactions with the database...',
          published: true,
          author: allUsers[4],
        },
        {
          title: 'Understanding Clean Architecture',
          content: 'Clean Architecture helps separate business logic from the rest of the code...',
          published: false,
          author: allUsers[0],
        },
      ];

      const posts = await postRepository.save(postsData);
      console.log(\`📝 \${posts.length} articles created.\`);

      // --- 4. DEMO COMMENTS ---
      const commentsData = [
        {
          content: 'Excellent article! I was able to apply these tips directly to my NestJS project.',
          post: posts[0],
          author: allUsers[2],
        },
        {
          content: 'Very clear and well explained, thanks for sharing about Prisma 👏',
          post: posts[3],
          author: allUsers[0],
        },
        {
          content: 'I didn't know about JWT before this article, it's a real revelation.',
          post: posts[1],
          author: allUsers[4],
        },
        {
          content: 'Clean Architecture always seemed blurry to me, this article finally enlightened me.',
          post: posts[4],
          author: allUsers[1],
        },
        {
          content: 'Thanks for the content! I would like to see a complete tutorial with NestJS + Prisma.',
          post: posts[2],
          author: allUsers[3],
        },
      ];

      const comments = await commentRepository.save(commentsData);
      console.log(\`💬 \${comments.length} comments created.\`);

      console.log('✅ TypeORM seeding finished successfully! 🚀');
    }
  }

  // Direct execution script
  import { AppDataSource } from '../src/config/data-source';

  AppDataSource.initialize()
    .then(async (dataSource) => {
      const seeder = new DemoSeeder(dataSource);
      await seeder.run();
      await dataSource.destroy();
    })
    .catch((error) => {
      console.error('❌ Error during TypeORM seeding:', error);
      process.exit(1);
    });
  `;
}

module.exports = { setupTypeORM };
