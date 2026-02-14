const {
  createDirectory,
  createFile,
  safeUpdateAppModule,
  capitalize,
  decapitalize,
} = require("../userInput");
const { logInfo } = require("../loggers/logInfo");
const { logSuccess } = require("../loggers/logSuccess");
const {
  generateEntityFileContent,
  generateDto,
  generateMapper,
  generateController,
  generateRepository,
  generateMongooseSchemaFileContent,
} = require("../utils");
const { updatePrismaSchema } = require("../setups/setupPrisma");
const { updateExistingEntityRelation } = require("./domain/entityUpdater");
const { applyRelationPatches } = require("./relation/relation.engine");

async function generateCleanModule(name, config, entityData) {
  const entityNameCapitalized = capitalize(name);
  const entityNameLower = decapitalize(name);
  const entityPath = `src/${entityNameLower}`;

  // Chemins de la Clean Architecture
  const folders = [
    "application/use-cases",
    "application/dtos",
    "domain/interfaces",
    "domain/entities",
    "infrastructure/mappers",
    "infrastructure/repositories",
    "application/services",
    "infrastructure/adapters",
    "presentation/controllers",
  ];

  logInfo(
    ` Building Clean Architecture layers for module: ${entityNameCapitalized}`,
  );

  // 1. Création des dossiers
  for (const folder of folders) {
    await createDirectory(`${entityPath}/${folder}`);
  }

  // 2. Génération de l'Entité de Domaine
  const entityContent = await generateEntityFileContent(entityData);
  await createFile({
    path: `${entityPath}/domain/entities/${entityNameLower}.entity.ts`,
    contente: entityContent,
  });

  // 3. Génération de l'Interface Repository
  await createFile({
    path: `${entityPath}/domain/interfaces/${entityNameLower}.repository.interface.ts`,
    contente: getRepositoryInterfaceTemplate(
      entityNameCapitalized,
      entityNameLower,
    ),
  });

  // 4. Génération du Repository (Implementation)
  await generateRepository(name, config.orm);

  // 5. Génération des Use Cases (Create, Get, Update, Delete)
  await generateUseCases(entityPath, entityNameCapitalized, entityNameLower);

  // 6. Génération des DTOs
  const dtoContent = await generateDto(entityData, config.swagger);
  await createFile({
    path: `${entityPath}/application/dtos/${entityNameLower}.dto.ts`,
    contente: dtoContent,
  });

  // 7. Génération du Mapper
  const mapperContent = await generateMapper(entityData);
  await createFile({
    path: `${entityPath}/infrastructure/mappers/${entityNameLower}.mapper.ts`,
    contente: mapperContent,
  });

  // ÉTAPE RELATIONS : Patching des fichiers si une relation existe
  if (entityData.relation) {
    const { target, type } = entityData.relation;
    logInfo(
      `🔗 Linking ${entityNameCapitalized} with ${capitalize(target)} (${type})...`,
    );

    await updateExistingEntityRelation(target, name, type);

    /*  if (type === "n-1" || type === "1-1") {
      await patchDtoWithRelation(name, target, config.swagger);
      await patchMapperWithRelation(name, target);
    } */

    await applyRelationPatches({
      source: name,
      target,
      relationType: type,
      useSwagger: config.swagger,
    });
  }

  // 8. Génération du Service, Adapter et Controller
  await generateServiceAndAdapter(
    entityPath,
    entityNameCapitalized,
    entityNameLower,
  );

  const controllerContent = await generateController(
    name,
    entityPath,
    config.swagger,
  );
  await createFile({
    path: `${entityPath}/presentation/controllers/${entityNameLower}.controller.ts`,
    contente: controllerContent,
  });

  // 9. Génération du Module NestJS
  const moduleContent = getModuleTemplate(
    entityNameCapitalized,
    entityNameLower,
    entityPath,
    config,
  );
  await createFile({
    path: `${entityPath}/${entityNameLower}.module.ts`,
    contente: moduleContent,
  });

  // 10. Auto-enregistrement dans AppModule
  await safeUpdateAppModule(entityNameLower);

  // 11.
  await setupDatabase(config, entityData);

  logSuccess(
    ` ✨ Module ${entityNameCapitalized} generated and registered successfully!`,
  );
}

// --- HELPERS DE TEMPLATES (Extraits de ton setup original) ---

function getRepositoryInterfaceTemplate(cap, low) {
  return `import { Create${cap}Dto, Update${cap}Dto } from 'src/${low}/application/dtos/${low}.dto';
import { ${cap}Entity } from 'src/${low}/domain/entities/${low}.entity';

export const I${cap}RepositoryName = 'I${cap}Repository';

export interface I${cap}Repository {
  create(data: Create${cap}Dto): Promise<${cap}Entity>;
  findById(id: string): Promise<${cap}Entity | null>;
  findAll(): Promise<${cap}Entity[]>;
  update(id: string, data: Update${cap}Dto): Promise<${cap}Entity | null>;
  delete(id: string): Promise<void>;
}`;
}

///////////////////
async function generateUseCases(entityPath, cap, low) {
  const useCases = ["Create", "GetById", "GetAll", "Update", "Delete"];

  for (const useCase of useCases) {
    let content = "";
    const fileName = `${decapitalize(useCase)}-${low}.use-case.ts`;
    const fullPath = `${entityPath}/application/use-cases/${fileName}`;

    switch (useCase) {
      case "Create":
        content = `
import { Inject, Logger } from '@nestjs/common';
import { Create${cap}Dto } from 'src/${low}/application/dtos/${low}.dto';
import { I${cap}RepositoryName, type I${cap}Repository } from 'src/${low}/domain/interfaces/${low}.repository.interface';
import { ${cap}Entity } from 'src/${low}/domain/entities/${low}.entity';

export class Create${cap}UseCase {
  private readonly logger = new Logger(Create${cap}UseCase.name);

  constructor(
    @Inject(I${cap}RepositoryName)
    private readonly repository: I${cap}Repository,
  ) {}

  async execute(data: Create${cap}Dto): Promise<${cap}Entity> {
    this.logger.log('Starting creation process for ${cap}');
    const result = await this.repository.create(data);
    this.logger.log(\`Successfully created ${cap} (ID: \${result.getId()})\`);
    return result;
  }
}`;
        break;

      case "GetById":
        content = `
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { I${cap}RepositoryName, type I${cap}Repository } from 'src/${low}/domain/interfaces/${low}.repository.interface';
import { ${cap}Entity } from 'src/${low}/domain/entities/${low}.entity';

export class GetById${cap}UseCase {
  private readonly logger = new Logger(GetById${cap}UseCase.name);

  constructor(
    @Inject(I${cap}RepositoryName)
    private readonly repository: I${cap}Repository,
  ) {}

  async execute(id: string): Promise<${cap}Entity> {
    this.logger.log(\`Fetching ${cap} (ID: \${id})\`);
    const result = await this.repository.findById(id);

    if (!result) {
      this.logger.warn(\`${cap} \${id} not found\`);
      throw new NotFoundException(\`${cap} not found\`);
    }

    this.logger.log(\`Successfully retrieved ${cap}\`);
    return result;
  }
}`;
        break;

      case "GetAll":
        content = `
import { Inject, Logger } from '@nestjs/common';
import { I${cap}RepositoryName, type I${cap}Repository } from 'src/${low}/domain/interfaces/${low}.repository.interface';
import { ${cap}Entity } from 'src/${low}/domain/entities/${low}.entity';

export class GetAll${cap}UseCase {
  private readonly logger = new Logger(GetAll${cap}UseCase.name);

  constructor(
    @Inject(I${cap}RepositoryName)
    private readonly repository: I${cap}Repository,
  ) {}

  async execute(): Promise<${cap}Entity[]> {
    this.logger.log('Requesting all ${cap} records');
    const results = await this.repository.findAll();
    this.logger.log(\`Retrieved \${results.length} ${cap}(s)\`);
    return results;
  }
}`;
        break;

      case "Update":
        content = `
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { Update${cap}Dto } from 'src/${low}/application/dtos/${low}.dto';
import { I${cap}RepositoryName, type I${cap}Repository } from 'src/${low}/domain/interfaces/${low}.repository.interface';
import { ${cap}Entity } from 'src/${low}/domain/entities/${low}.entity';

export class Update${cap}UseCase {
  private readonly logger = new Logger(Update${cap}UseCase.name);

  constructor(
    @Inject(I${cap}RepositoryName)
    private readonly repository: I${cap}Repository,
  ) {}

  async execute(id: string, data: Update${cap}Dto): Promise<${cap}Entity> {
    this.logger.log(\`Updating ${cap} (ID: \${id})\`);
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException(\`${cap} not found\`);

    const result = await this.repository.update(id, data);
    if (!result) {
      this.logger.error(\`Update failed for ${cap} \${id} - entity disappeared\`);
      throw new NotFoundException(\`${cap} update failed\`);
    }

    this.logger.log(\`Successfully updated ${cap} \${id}\`);
    return result;
  }
}`;
        break;

      case "Delete":
        content = `
import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { I${cap}RepositoryName, type I${cap}Repository } from 'src/${low}/domain/interfaces/${low}.repository.interface';

export class Delete${cap}UseCase {
  private readonly logger = new Logger(Delete${cap}UseCase.name);

  constructor(
    @Inject(I${cap}RepositoryName)
    private readonly repository: I${cap}Repository,
  ) {}

  async execute(id: string): Promise<void> {
    this.logger.log(\`Deleting ${cap} (ID: \${id})\`);
    const existing = await this.repository.findById(id);
    if (!existing) throw new NotFoundException(\`${cap} not found\`);

    await this.repository.delete(id);
    this.logger.log(\`Successfully deleted ${cap} \${id}\`);
  }
}`;
        break;
    }

    await createFile({
      path: fullPath,
      contente: content.trim(),
    });
  }
}

//////////////////
function getModuleTemplate(cap, low, entityPath, config) {
  let importsBlock = [];
  let providersBlock = [];
  let extraImports = "";
  let forwardRefImport = "";

  // Gestion de l'ORM pour les imports du Module
  if (config.orm === "prisma") {
    extraImports += `import { PrismaModule } from 'src/prisma/prisma.module';\n`;
    importsBlock.push("PrismaModule");
  } else if (config.orm === "typeorm") {
    extraImports += `import { ${cap} } from 'src/entities/${cap}.entity';\nimport { TypeOrmModule } from '@nestjs/typeorm';\n`;
    importsBlock.push(`TypeOrmModule.forFeature([${cap}])`);
  } else if (config.orm === "mongoose") {
    extraImports += `import { MongooseModule } from '@nestjs/mongoose';\nimport { ${cap}, ${cap}Schema } from 'src/${low}/infrastructure/persistence/mongoose/${low}.schema';\n`;
    importsBlock.push(
      `MongooseModule.forFeature([{ name: ${cap}.name, schema: ${cap}Schema }])`,
    );
  }

  // Support Auth si nécessaire (User module)
  if (low === "user" && config.auth) {
    extraImports += "import { AuthModule } from 'src/auth/auth.module';\n";
    importsBlock.push("forwardRef(() => AuthModule)");
    forwardRefImport = " forwardRef,";
  }

  // Providers standard pour la Clean Arch
  providersBlock.push(
    `{ provide: 'I${cap}Repository', useClass: ${cap}Repository }`,
    `${cap}Service`,
    `Create${cap}UseCase`,
    `Update${cap}UseCase`,
    `GetById${cap}UseCase`,
    `GetAll${cap}UseCase`,
    `Delete${cap}UseCase`,
    `${cap}Mapper`,
  );

  return `
import {${forwardRefImport} Module } from '@nestjs/common';
${extraImports}
import { ${cap}Service } from 'src/${low}/application/services/${low}.service';
import { ${cap}Controller } from 'src/${low}/presentation/controllers/${low}.controller';
import { ${cap}Repository } from 'src/${low}/infrastructure/repositories/${low}.repository';
import { Create${cap}UseCase } from 'src/${low}/application/use-cases/create-${low}.use-case';
import { Update${cap}UseCase } from 'src/${low}/application/use-cases/update-${low}.use-case';
import { GetById${cap}UseCase } from 'src/${low}/application/use-cases/getById-${low}.use-case';
import { GetAll${cap}UseCase } from 'src/${low}/application/use-cases/getAll-${low}.use-case';
import { Delete${cap}UseCase } from 'src/${low}/application/use-cases/delete-${low}.use-case';
import { ${cap}Mapper } from 'src/${low}/infrastructure/mappers/${low}.mapper';

@Module({
  imports: [
    ${importsBlock.join(",\n    ")}
  ],
  controllers: [
    ${cap}Controller
  ],
  providers: [
    ${providersBlock.join(",\n    ")}
  ],
  exports: [
    ${cap}Service,
    'I${cap}Repository'
  ]
})
export class ${cap}Module {}
`.trim();
}

////////////////
async function generateServiceAndAdapter(
  entityPath,
  entityNameCapitalized,
  entityNameLower,
) {
  // 8. Service
  await createFile({
    path: `${entityPath}/application/services/${entityNameLower}.service.ts`,
    contente: `/**
 * PostService handles business logic
 * for the Post entity.
 *
 * It acts as a bridge between the Controller and the Repository.
 * Responsibilities include:
 * - Data validation and transformation
 * - Orchestrating use cases
 * - Managing transactions
 */

import { Injectable } from '@nestjs/common';
import { Create${entityNameCapitalized}UseCase } from 'src/${entityNameLower}/application/use-cases/create-${entityNameLower}.use-case';
import { Update${entityNameCapitalized}UseCase } from 'src/${entityNameLower}/application/use-cases/update-${entityNameLower}.use-case';
import { GetById${entityNameCapitalized}UseCase } from 'src/${entityNameLower}/application/use-cases/getById-${entityNameLower}.use-case';
import { GetAll${entityNameCapitalized}UseCase } from 'src/${entityNameLower}/application/use-cases/getAll-${entityNameLower}.use-case';
import { Delete${entityNameCapitalized}UseCase } from 'src/${entityNameLower}/application/use-cases/delete-${entityNameLower}.use-case';
import { Create${entityNameCapitalized}Dto, Update${entityNameCapitalized}Dto } from 'src/${entityNameLower}/application/dtos/${entityNameLower}.dto';
import { ${entityNameCapitalized}Entity } from 'src/${entityNameLower}/domain/entities/${entityNameLower}.entity';

@Injectable()
export class ${entityNameCapitalized}Service {
  constructor(
    private readonly createUseCase: Create${entityNameCapitalized}UseCase,
    private readonly updateUseCase: Update${entityNameCapitalized}UseCase,
    private readonly getByIdUseCase: GetById${entityNameCapitalized}UseCase,
    private readonly getAllUseCase: GetAll${entityNameCapitalized}UseCase,
    private readonly deleteUseCase: Delete${entityNameCapitalized}UseCase,
  ) {}

  async create(dto: Create${entityNameCapitalized}Dto): Promise<${entityNameCapitalized}Entity> {
    return await this.createUseCase.execute(dto);
  }
  async update(id: string, dto: Update${entityNameCapitalized}Dto): Promise<${entityNameCapitalized}Entity | null> {
    return await this.updateUseCase.execute(id, dto);
  }
  async getById(id: string): Promise<${entityNameCapitalized}Entity | null> {
    return await this.getByIdUseCase.execute(id);
  }
  async getAll(): Promise<${entityNameCapitalized}Entity[]> {
    return await this.getAllUseCase.execute();
  }
  async delete(id: string): Promise<void> {
    return await this.deleteUseCase.execute(id);
  }
}
`.trim(),
  });

  // 9. Adapter
  await createFile({
    path: `${entityPath}/infrastructure/adapters/${entityNameLower}.adapter.ts`,
    contente: `
// L'adaptateur permet de transformer ou d'adapter les données d'un format source vers un format cible.
// Cela est particulièrement utile lorsque nous devons interagir avec des API externes ou des services ayant des structures de données différentes.

export class ${entityNameCapitalized}Adapter {
  // La méthode 'adapt' prend des données brutes d'un format spécifique et les transforme
  // en un format qui est attendu par le système de notre domaine.
  adapt(data: any) {
    // Exemple d'adaptation des données - ceci est un exemple générique.
    // Nous transformons les données pour que le format interne du système soit respecté.

    const adaptedData = {
      // Assurez-vous que vous mappez les propriétés nécessaires et les transformez.
      id: data.id, // Mapping de l'ID de la donnée source à notre format interne
      name: data.fullName || data.name, // Exemple de transformation de champ
      description: data.details || data.description, // Gestion des données optionnelles
      createdAt: new Date(data.createdAt), // Transformation de la date
      updatedAt: new Date(data.updatedAt), // Idem pour la date de mise à jour
      // Vous pouvez adapter d'autres champs en fonction des exigences spécifiques
    };

    // Retournez les données adaptées dans un format compréhensible pour le système
    return adaptedData;
  }
}
`,
  });
}

async function setupDatabase(config, entityData) {
  logInfo("Configuring the database...");

  switch (config.orm) {
    case "prisma":
      await updatePrismaSchema(entityData);
      break;
    case "typeorm":
      await setupMySQL(inputs);
      break;
    case "mongoose":
      await setupMongoDB(inputs); // MongoDB Configuration
      break;
    case "sqlite":
      await setupSQLite(inputs); // SQLite Configuration
      break;
    case "firebase":
      await setupFirebase(inputs); // Firebase Configuration
      break;
    case "redis":
      await setupRedis(inputs); // Redis Configuration
      break;
    default:
      throw new Error("Unsupported database.");
  }
}

module.exports = generateCleanModule;
