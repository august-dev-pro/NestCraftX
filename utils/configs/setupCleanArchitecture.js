const { logInfo } = require("../loggers/logInfo");
const {
  createDirectory,
  createFile,
  updateFile,
  safeUpdateAppModule,
} = require("../userInput");
const { logError } = require("../loggers/logError");
const { logSuccess } = require("../loggers/logSuccess");
const {
  generateEntityFileContent,
  generateMapper,
  generateDto,
  generateMiddlewares,
  generateRepository,
  generateController,
  generateMongooseSchemaFileContent,
  pluralize,
} = require("../utils");

async function setupCleanArchitecture(inputs) {
  logInfo("Generating Clean Architecture structure");

  const entitiesData = inputs.entitiesData;
  const dbConfig = inputs.dbConfig;
  const useSwagger = inputs.useSwagger;
  const useAuth = inputs.useAuth;
  const mode = "full";

  const srcPath = "src";
  const baseFolders = [
    "application/use-cases",
    "application/dtos",
    "domain/interfaces",
    "domain/entities",
    // "domain/enums",
    "infrastructure/mappers",
    "infrastructure/repositories",
    "application/services",
    "infrastructure/adapters",
    "presentation/controllers",
  ];

  try {
    // modifier app module pour exporter configService globalement
    const appModuleTsPath = "src/app.module.ts";

    // ajouter l'import configModule
    await updateFile({
      path: appModuleTsPath,
      pattern: "import { Module } from '@nestjs/common';",
      replacement: `import { Module } from '@nestjs/common';\nimport { ConfigModule } from '@nestjs/config';`,
    });

    // configurer configservice
    await updateFile({
      path: "src/app.module.ts",
      pattern: "imports: [",
      replacement: `imports: [
    ConfigModule.forRoot({
     isGlobal: true, // Make ConfigModule globally accessible
     envFilePath: '.env', // Load environment variables
    }),`,
    });

    for (const entity of entitiesData.entities) {
      const entityNameCapitalized = capitalize(entity.name);
      const entityNameLower = decapitalize(entity.name);

      if (entityNameLower == "session") continue;

      const entityPath = `${srcPath}/${entityNameLower}`;

      for (const folder of baseFolders) {
        await createDirectory(`${entityPath}/${folder}`);
      }

      if (dbConfig.orm === "mongoose") {
        const mongooseSchemaContent = await generateMongooseSchemaFileContent(
          entity,
          entitiesData,
          mode
        );

        const schemaPath = `src/${entity.name}/infrastructure/persistence/mongoose`;
        await createDirectory(schemaPath);

        await createFile({
          path: `${schemaPath}/${entity.name}.schema.ts`,
          contente: mongooseSchemaContent,
        });
      }

      // 1. Entité
      const entityContent = await generateEntityFileContent(entity);
      await createFile({
        path: `${entityPath}/domain/entities/${entityNameLower}.entity.ts`,
        contente: entityContent,
      });

      let findByEmailMethod = "";
      if (entityNameLower == "user") {
        findByEmailMethod = `
        findByEmail(email: string): Promise<${entityNameCapitalized}Entity | null>;
        `;
      }

      // 2. Interface Repository
      await createFile({
        path: `${entityPath}/domain/interfaces/${entityNameLower}.repository.interface.ts`,
        contente: `import { Create${entityNameCapitalized}Dto, Update${entityNameCapitalized}Dto } from 'src/${entityNameLower}/application/dtos/${entityNameLower}.dto';
        import { ${entityNameCapitalized}Entity } from 'src/${entityNameLower}/domain/entities/${entityNameLower}.entity';

        export const I${entityNameCapitalized}RepositoryName = 'I${entityNameCapitalized}Repository';

        export interface I${entityNameCapitalized}Repository {
          create(data: Create${entityNameCapitalized}Dto): Promise<${entityNameCapitalized}Entity>;
          findById(id: string): Promise<${entityNameCapitalized}Entity | null>;
          findAll(): Promise<${entityNameCapitalized}Entity[]>;
          update(id: string, data: Update${entityNameCapitalized}Dto): Promise<${entityNameCapitalized}Entity | null>;
          delete(id: string): Promise<void>;
          ${findByEmailMethod}
        }`,
      });

      // 3. Repository Implémentation
      await generateRepository(entity.name, dbConfig.orm);

      // 4. Use Cases
      const useCases = ["Create", "GetById", "GetAll", "Update", "Delete"];
      useCases.forEach(async (useCase) => {
        let content = "";
        const entityName = capitalize(entity.name);
        const entityNameLower = decapitalize(entity.name);

        switch (useCase) {
          case "Create":
            content = `/**
 * Use case to handle the creation of a new ${entityName}.
 */

import { Inject, Logger } from '@nestjs/common';
import { Create${entityName}Dto } from 'src/${entity.name}/application/dtos/${entity.name}.dto';
import { I${entityName}RepositoryName, I${entityName}Repository } from 'src/${entity.name}/domain/interfaces/${entity.name}.repository.interface';
import { ${entityName}Entity } from 'src/${entity.name}/domain/entities/${entityNameLower}.entity';

export class Create${entityName}UseCase {
  private readonly logger = new Logger(Create${entityName}UseCase.name);

  constructor(
    @Inject(I${entityName}RepositoryName)
    private readonly ${entityNameLower}Repository: I${entityName}Repository,
  ) {}

  async execute(data: Create${entityName}Dto): Promise<${entityName}Entity> {
    this.logger.log('Starting creation process for ${entityName}');
    const result = await this.${entityNameLower}Repository.create(data);
    this.logger.log(\`Successfully created ${entityName} (ID: \${result.getId()})\`);
    return result;
  }
}
`;
            break;

          case "GetById":
            content = `/**
 * Use case to retrieve a specific ${entityName} by its unique identifier.
 */

import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { I${entityName}RepositoryName, I${entityName}Repository } from 'src/${entity.name}/domain/interfaces/${entity.name}.repository.interface';
import { ${entityName}Entity } from 'src/${entity.name}/domain/entities/${entityNameLower}.entity';

export class GetById${entityName}UseCase {
  private readonly logger = new Logger(GetById${entityName}UseCase.name);

  constructor(
    @Inject(I${entityName}RepositoryName)
    private readonly ${entityNameLower}Repository: I${entityName}Repository,
  ) {}

  async execute(id: string): Promise<${entityName}Entity> {
    this.logger.log(\`Fetching ${entityName} (ID: \${id})\`);
    const result = await this.${entityNameLower}Repository.findById(id);

    if (!result) {
      this.logger.warn(\`${entityName} \${id} not found\`);
      throw new NotFoundException(\`${entityName} not found\`);
    }

    this.logger.log(\`Successfully retrieved ${entityName}\`);
    return result;
  }
}
`;
            break;

          case "GetAll":
            content = `/**
 * Use case to retrieve all ${entityName} records from the database.
 */

import { Inject, Logger } from '@nestjs/common';
import { I${entityName}RepositoryName, I${entityName}Repository } from 'src/${entity.name}/domain/interfaces/${entity.name}.repository.interface';
import { ${entityName}Entity } from 'src/${entity.name}/domain/entities/${entityNameLower}.entity';

export class GetAll${entityName}UseCase {
  private readonly logger = new Logger(GetAll${entityName}UseCase.name);

  constructor(
    @Inject(I${entityName}RepositoryName)
    private readonly ${entityNameLower}Repository: I${entityName}Repository,
  ) {}

  async execute(): Promise<${entityName}Entity[]> {
    this.logger.log('Requesting all ${entityName} records');
    const results = await this.${entityNameLower}Repository.findAll();
    this.logger.log(\`Retrieved \${results.length} ${entityName}(s)\`);
    return results;
  }
}
`;
            break;

          case "Update":
            content = `/**
 * Use case to update the data of an existing ${entityName}.
 */

import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { Update${entityName}Dto } from 'src/${entity.name}/application/dtos/${entity.name}.dto';
import { I${entityName}RepositoryName, I${entityName}Repository } from 'src/${entity.name}/domain/interfaces/${entity.name}.repository.interface';
import { ${entityName}Entity } from 'src/${entity.name}/domain/entities/${entityNameLower}.entity';

export class Update${entityName}UseCase {
  private readonly logger = new Logger(Update${entityName}UseCase.name);

  constructor(
    @Inject(I${entityName}RepositoryName)
    private readonly ${entityNameLower}Repository: I${entityName}Repository,
  ) {}

  async execute(id: string, data: Update${entityName}Dto): Promise<${entityName}Entity> {
    this.logger.log(\`Updating ${entityName} (ID: \${id})\`);

    const existing = await this.${entityNameLower}Repository.findById(id);
    if (!existing) {
      this.logger.warn(\`${entityName} \${id} not found for update\`);
      throw new NotFoundException(\`${entityName} not found\`);
    }

    const result = await this.${entityNameLower}Repository.update(id, data);

    if (!result) {
      this.logger.error(\`Update failed for ${entityName} \${id} - entity disappeared\`);
      throw new NotFoundException(\`${entityName} update failed\`);
    }

    this.logger.log(\`Successfully updated ${entityName} \${id}\`);
    return result;
  }
}
`;
            break;

          case "Delete":
            content = `/**
 * Use case to permanently remove an ${entityName} from the system.
 */

import { Inject, Logger, NotFoundException } from '@nestjs/common';
import { I${entityName}RepositoryName, I${entityName}Repository } from 'src/${entity.name}/domain/interfaces/${entity.name}.repository.interface';

export class Delete${entityName}UseCase {
  private readonly logger = new Logger(Delete${entityName}UseCase.name);

  constructor(
    @Inject(I${entityName}RepositoryName)
    private readonly ${entityNameLower}Repository: I${entityName}Repository,
  ) {}

  async execute(id: string): Promise<void> {
    this.logger.log(\`Deleting ${entityName} (ID: \${id})\`);

    const existing = await this.${entityNameLower}Repository.findById(id);
    if (!existing) {
      this.logger.warn(\`${entityName} \${id} not found for deletion\`);
      throw new NotFoundException(\`${entityName} not found\`);
    }

    await this.${entityNameLower}Repository.delete(id);
    this.logger.log(\`Successfully deleted ${entityName} \${id}\`);
  }
}
`;
            break;
        }

        await createFile({
          path: `${entityPath}/application/use-cases/${decapitalize(useCase)}-${
            entity.name
          }.use-case.ts`,
          contente: content.trim(),
        });
      });

      // 5. DTOs
      const DtoFileContent = await generateDto(entity, useSwagger);
      await createFile({
        path: `${entityPath}/application/dtos/${entity.name}.dto.ts`,
        contente: DtoFileContent,
      });

      if (entity.name.toLowerCase() === "user") {
        await createDirectory(`${entityPath}/domain/enums`);
        await createFile({
          path: `${entityPath}/domain/enums/role.enum.ts`,
          contente: `// Enumération des rôles utilisateurs
export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}
`,
        });
      }

      // 7. Mapper
      const mapperFileContent = await generateMapper(entity);
      await createFile({
        path: `${entityPath}/infrastructure/mappers/${entityNameLower}.mapper.ts`,
        contente: mapperFileContent,
      });

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

      // 10. Controller
      const controllerContente = await generateController(
        entity.name,
        entityPath,
        useSwagger
      );
      await createFile({
        path: `${entityPath}/presentation/controllers/${entityNameLower}.controller.ts`,
        contente: controllerContente,
      });

      // 11. Module
      let importsBlock = [];
      let providersBlock = [];
      let extraImports = "";
      let forwardRefImport = "";

      if (dbConfig.orm === "prisma") {
        extraImports = `import { PrismaModule } from 'src/prisma/prisma.module';`;
        importsBlock.push("PrismaModule");
      } else if (dbConfig.orm === "typeorm") {
        extraImports = `import { ${entityNameCapitalized} } from 'src/entities/${entityNameCapitalized}.entity';\nimport { TypeOrmModule } from '@nestjs/typeorm';`;
        importsBlock.push(
          `TypeOrmModule.forFeature([${entityNameCapitalized}])`
        );
      } else if (dbConfig.orm === "mongoose") {
        extraImports = `import { MongooseModule } from '@nestjs/mongoose';
import { ${entityNameCapitalized}, ${entityNameCapitalized}Schema } from '${entityPath}/infrastructure/persistence/mongoose/${entityNameLower}.schema';`;
        importsBlock.push(
          `MongooseModule.forFeature([{ name: ${entityNameCapitalized}.name, schema: ${entityNameCapitalized}Schema }])`
        );
      }

      if (entityNameLower == "user" && useAuth) {
        extraImports += "\nimport { AuthModule } from 'src/auth/auth.module';";
        importsBlock.push("forwardRef(() => AuthModule)");
        forwardRefImport = " forwardRef,";
      }

      // Ajoute l'import du service
      extraImports += `\nimport { ${entityNameCapitalized}Service } from '${entityPath}/application/services/${entityNameLower}.service';`;

      // Always necessary providers
      providersBlock.push(
        `{
        provide: 'I${entityNameCapitalized}Repository',
        useClass: ${entityNameCapitalized}Repository,
        }`,
        `${entityNameCapitalized}Service`,
        `Create${entityNameCapitalized}UseCase`,
        `Update${entityNameCapitalized}UseCase`,
        `GetById${entityNameCapitalized}UseCase`,
        `GetAll${entityNameCapitalized}UseCase`,
        `Delete${entityNameCapitalized}UseCase`,
        `${entityNameCapitalized}Mapper`
      );

      await createFile({
        path: `${entityPath}/${entityNameLower}.module.ts`,
        contente: `
/**
 * ${entityNameCapitalized}Module est le module principal qui gère l'entité ${entityNameCapitalized}.
 * Il regroupe tous les composants nécessaires pour traiter cette entité :
 * - Contrôleur
 * - Repository
 * - Use Cases
 * - Mapper
 * - Service
 */
import {${forwardRefImport} Module } from '@nestjs/common';
${extraImports}
import { ${entityNameCapitalized}Controller } from '${entityPath}/presentation/controllers/${entityNameLower}.controller';
import { ${entityNameCapitalized}Repository } from '${entityPath}/infrastructure/repositories/${entityNameLower}.repository';
import { Create${entityNameCapitalized}UseCase } from '${entityPath}/application/use-cases/create-${entityNameLower}.use-case';
import { Update${entityNameCapitalized}UseCase } from '${entityPath}/application/use-cases/update-${entityNameLower}.use-case';
import { GetById${entityNameCapitalized}UseCase } from '${entityPath}/application/use-cases/getById-${entityNameLower}.use-case';
import { GetAll${entityNameCapitalized}UseCase } from '${entityPath}/application/use-cases/getAll-${entityNameLower}.use-case';
import { Delete${entityNameCapitalized}UseCase } from '${entityPath}/application/use-cases/delete-${entityNameLower}.use-case';
import { ${entityNameCapitalized}Mapper } from '${entityPath}/infrastructure/mappers/${entityNameLower}.mapper';

@Module({
  imports: [
    ${importsBlock.join(",\n    ")}
  ],
  controllers: [
    ${entityNameCapitalized}Controller
  ],
  providers: [
    ${providersBlock.join(",\n    ")}
  ],
  exports: [
    ${entityNameCapitalized}Service, 'I${entityNameCapitalized}Repository'
  ]
})
export class ${entityNameCapitalized}Module {}
`.trim(),
      });

      await safeUpdateAppModule(entityNameLower);
    }

    await generateMiddlewares(dbConfig.orm);

    // modification de AppModule
    const appModulePath = "src/app.module.ts";

    // Étape 1 : Ajouter les imports nécessaires
    await updateFile({
      path: appModulePath,
      pattern: `import { Module } from '@nestjs/common';`,
      replacement: `import { Module } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';`,
    });

    // Étape 2 : Ajouter le provider APP_INTERCEPTOR dans providers[]
    await updateFile({
      path: appModulePath,
      pattern: `providers: \\[`,
      replacement: `providers: [
  {
    provide: APP_INTERCEPTOR,
    useClass: ResponseInterceptor,
  },`,
    });

    logSuccess(`Structure generated successfully!`);
  } catch (error) {
    logError(
      `Process encountered an error during Clean Architecture setup: ${error}`
    );
    throw error;
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function decapitalize(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

module.exports = { setupCleanArchitecture };
