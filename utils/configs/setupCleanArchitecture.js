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
} = require("../utils");

async function setupCleanArchitecture(inputs) {
  logInfo("Génération de la structure Clean Architecture");
  // log("inputs entitiesData: ", inputs.entitiesData.entities);

  const entitiesData = inputs.entitiesData;
  const dbConfig = inputs.dbConfig;
  const useSwagger = inputs.useSwagger;

  const srcPath = "src";
  const baseFolders = [
    "application/use-cases",
    "application/dtos",
    "application/interfaces",
    "domain/entities",
    "domain/enums",
    "domain/mappers",
    "infrastructure/repositories",
    "infrastructure/services",
    "infrastructure/adapters",
    "presentation/controllers",
  ];

  try {
    // modifier app module pour exporter configService globalement
    const appModuleTsPath = "src/app.module.ts";
    // let mainTs = fs.readFileSync(mainTsPath, "utf8");

    /* await createDirectory("src");
    await createFile({
      path: appModuleTsPath,
      contente: `import { Module } from '@nestjs/common';
@Module({
  imports: [],
  controllers: [],
  providers: [],
})
export class AppModule {}`,
    }); */

    // ajouter l'import configModule
    await updateFile({
      path: "src/app.module.ts",
      pattern: "import { Module } from '@nestjs/common';",
      replacement: `import { Module } from '@nestjs/common';\nimport { ConfigModule } from '@nestjs/config';`,
    });

    // configurer configservice
    await updateFile({
      path: "src/app.module.ts",
      pattern: "imports: [",
      replacement: `imports: [
    ConfigModule.forRoot({
      isGlobal: true, // Rendre ConfigModule accessible globalement
      envFilePath: '.env', // Charger les variables d'environnement
    }),`,
    });

    for (const entity of entitiesData.entities) {
      const entityNameCapitalized = capitalize(entity.name);
      const entityNameLower = decapitalize(entity.name);

      const entityPath = `${srcPath}/${entityNameLower}`;

      for (const folder of baseFolders) {
        await createDirectory(`${entityPath}/${folder}`);
      }

      // 📌 1. Entité
      const entityContent = await generateEntityFileContent(entity);
      await createFile({
        path: `${entityPath}/domain/entities/${entityNameLower}.entity.ts`,
        contente: entityContent,
      });

      // 📌 2. Interface Repository
      await createFile({
        path: `${entityPath}/application/interfaces/${entityNameLower}.repository.interface.ts`,
        contente: `import { Create${entityNameCapitalized}Dto, Update${entityNameCapitalized}Dto } from 'src/${entityNameLower}/application/dtos/${entityNameLower}.dto';
import { ${entityNameCapitalized}Entity } from 'src/${entityNameLower}/domain/entities/${entityNameLower}.entity';

export interface I${entityNameCapitalized}Repository {
  create(data: Create${entityNameCapitalized}Dto): Promise<${entityNameCapitalized}Entity>;
  findById(id: string): Promise<${entityNameCapitalized}Entity | null>;
  findAll(): Promise<${entityNameCapitalized}Entity[]>;
  update(id: string, data: Update${entityNameCapitalized}Dto): Promise<${entityNameCapitalized}Entity | null>;
  delete(id: string): Promise<void>;
}`,
      });

      // 📌 3. Repository Implémentation
      await generateRepository(entity.name, dbConfig.orm);
      /* await createFile({
        path: `${entityPath}/infrastructure/repositories/${entityNameLower}.repository.ts`,
        contente: repositoryContent,
      }); */

      // 📌 4. Use Cases
      const useCases = ["Create", "GetById", "GetAll", "Update", "Delete"];
      useCases.forEach(async (useCase) => {
        let content = "";

        switch (useCase) {
          case "Create":
            content = `/**
 * Use Case pour créer un ${capitalize(entity.name)}.
 */
import { Inject } from '@nestjs/common';
import { Create${capitalize(entity.name)}Dto } from 'src/${
              entity.name
            }/application/dtos/${entity.name}.dto';
import { I${capitalize(entity.name)}Repository } from 'src/${
              entity.name
            }/application/interfaces/${entity.name}.repository.interface';

export class ${useCase}${capitalize(entity.name)}UseCase {
  constructor(
    @Inject("I${capitalize(entity.name)}Repository")
    private readonly ${decapitalize(entity.name)}Repository: I${capitalize(
              entity.name
            )}Repository,
  ) {}

  execute(data: Create${capitalize(entity.name)}Dto) {
    return this.${decapitalize(entity.name)}Repository.create(data);
  }
}`;
            break;

          case "GetById":
            content = `/**
 * Use Case pour récupérer un ${capitalize(entity.name)} par son ID.
 */
import { Inject } from '@nestjs/common';
import { I${capitalize(entity.name)}Repository } from 'src/${
              entity.name
            }/application/interfaces/${entity.name}.repository.interface';

export class ${useCase}${capitalize(entity.name)}UseCase {
  constructor(
    @Inject("I${capitalize(entity.name)}Repository")
    private readonly ${decapitalize(entity.name)}Repository: I${capitalize(
              entity.name
            )}Repository,
  ) {}

  execute(id: string) {
    return this.${decapitalize(entity.name)}Repository.findById(id);
  }
}`;
            break;

          case "GetAll":
            content = `/**
 * Use Case pour récupérer tous les ${capitalize(entity.name)}s.
 */
import { Inject } from '@nestjs/common';
import { I${capitalize(entity.name)}Repository } from 'src/${
              entity.name
            }/application/interfaces/${entity.name}.repository.interface';

export class ${useCase}${capitalize(entity.name)}UseCase {
  constructor(
    @Inject("I${capitalize(entity.name)}Repository")
    private readonly ${decapitalize(entity.name)}Repository: I${capitalize(
              entity.name
            )}Repository,
  ) {}

  execute() {
    return this.${decapitalize(entity.name)}Repository.findAll();
  }
}`;
            break;

          case "Update":
            content = `/**
 * Use Case pour mettre à jour un ${capitalize(entity.name)} existant.
 */
import { Inject } from '@nestjs/common';
import { Update${capitalize(entity.name)}Dto } from 'src/${
              entity.name
            }/application/dtos/${entity.name}.dto';
import { I${capitalize(entity.name)}Repository } from 'src/${
              entity.name
            }/application/interfaces/${entity.name}.repository.interface';

export class ${useCase}${capitalize(entity.name)}UseCase {
  constructor(
    @Inject("I${capitalize(entity.name)}Repository")
    private readonly ${decapitalize(entity.name)}Repository: I${capitalize(
              entity.name
            )}Repository,
  ) {}

  execute(id: string, data: Update${capitalize(entity.name)}Dto) {
    return this.${decapitalize(entity.name)}Repository.update(id, data);
  }
}`;
            break;

          case "Delete":
            content = `/**
 * Use Case pour supprimer un ${capitalize(entity.name)}.
 */
import { Inject } from '@nestjs/common';
import { I${capitalize(entity.name)}Repository } from 'src/${
              entity.name
            }/application/interfaces/${entity.name}.repository.interface';

export class ${useCase}${capitalize(entity.name)}UseCase {
  constructor(
    @Inject("I${capitalize(entity.name)}Repository")
    private readonly ${decapitalize(entity.name)}Repository: I${capitalize(
              entity.name
            )}Repository,
  ) {}

  execute(id: string) {
    return this.${decapitalize(entity.name)}Repository.delete(id);
  }
}`;
            break;
        }

        await createFile({
          path: `${entityPath}/application/use-cases/${decapitalize(useCase)}-${
            entity.name
          }.use-case.ts`,
          contente: content.trim(),
        });
      });

      // 📌 5. DTOs
      const DtoFileContent = await generateDto(entity, useSwagger);
      await createFile({
        path: `${entityPath}/application/dtos/${entity.name}.dto.ts`,
        contente: DtoFileContent,
      });

      // 📌 6. Enums
      await createFile({
        path: `${entityPath}/domain/enums/${entityNameLower}.enum.ts`,
        contente: `// Enumération des différents états possibles pour ${entityNameCapitalized}
export enum ${entityNameCapitalized}Enum {
  // Décommentez et ajustez les valeurs de l'énumération selon les besoins de votre entité.
  // Exemple :
  // ACTIVE = 'ACTIVE', // Représente l'état actif de l'entité
  // INACTIVE = 'INACTIVE', // Représente l'état inactif de l'entité
  // Vous pouvez ajouter d'autres états si nécessaire, comme 'PENDING', 'ARCHIVED', etc.
}
`,
      });

      if (entity.name.toLowerCase() === "user") {
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

      // 📌 7. Mapper
      const mapperFileContent = await generateMapper(entity);
      await createFile({
        path: `${entityPath}/domain/mappers/${entity.name}.mapper.ts`,
        contente: mapperFileContent,
      });

      // 📌 8. Service
      await createFile({
        path: `${entityPath}/infrastructure/services/${entityNameLower}.service.ts`,
        contente: `
// Le service est responsable de la logique métier de l'application. Il agit comme un orchestrateur entre
// différents composants tels que les repositories, les use cases et les adaptateurs.

import { Inject } from '@nestjs/common';
import { I${entityNameCapitalized}Repository } from 'src/${entityNameLower}/application/interfaces/${entityNameLower}.repository.interface';

export class ${entityNameCapitalized}Service {
  constructor(
    @Inject("I${entityNameCapitalized}Repository")
    private readonly repository: I${entityNameCapitalized}Repository,
  ) {}

  // La méthode 'process' prend en charge la logique pour traiter les données.
  async process(data: any) {
    if (!data || !data.id) {
      throw new Error('Données invalides, ID requis');
    }

    const entityFromDb = await this.repository.findById(data.id);

    if (!entityFromDb) {
      throw new Error('Entité non trouvée avec cet ID');
    }

    const processedData = {
      ...entityFromDb,
      updatedAt: new Date(),
      processedBy: 'System',
    };

    return processedData;
  }

  // Vous pouvez ajouter d'autres méthodes métier ici si nécessaire.
  async create(data: any) {
    // Logique pour créer une nouvelle entité
  }

  async update(id: string, data: any) {
    // Logique pour mettre à jour une entité existante
  }

  async delete(id: string) {
    // Logique pour supprimer une entité
  }
}
`,
      });

      // 📌 9. Adapter
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

      // 📌 10. Controller
      const controllerContente = await generateController(
        entity.name,
        entityPath,
        useSwagger
      );
      await createFile({
        path: `${entityPath}/presentation/controllers/${entityNameLower}.controller.ts`,
        contente: controllerContente,
      });

      // 📌 11. Module
      let importsBlock = [];
      let providersBlock = [];
      let extraImports = "";

      if (dbConfig.orm === "prisma") {
        extraImports = `import { PrismaService } from 'src/prisma/prisma.service';`;
        providersBlock.push("PrismaService");
      } else if (dbConfig.orm === "typeorm") {
        extraImports = `import { ${entityNameCapitalized} } from 'src/entities/${entityNameCapitalized}.entity';\nimport { TypeOrmModule } from '@nestjs/typeorm';`;
        importsBlock.push(
          `TypeOrmModule.forFeature([${entityNameCapitalized}])`
        );
      }

      // Always necessary providers
      providersBlock.push(
        `{
    provide: 'I${entityNameCapitalized}Repository',
    useClass: ${entityNameCapitalized}Repository,
  }`,
        `${entityNameCapitalized}Repository`,
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
 */
import { Module } from '@nestjs/common';
${extraImports}
import { ${entityNameCapitalized}Controller } from '${entityPath}/presentation/controllers/${entityNameLower}.controller';
import { ${entityNameCapitalized}Repository } from '${entityPath}/infrastructure/repositories/${entityNameLower}.repository';
import { Create${entityNameCapitalized}UseCase } from '${entityPath}/application/use-cases/create-${entityNameLower}.use-case';
import { Update${entityNameCapitalized}UseCase } from '${entityPath}/application/use-cases/update-${entityNameLower}.use-case';
import { GetById${entityNameCapitalized}UseCase } from '${entityPath}/application/use-cases/getById-${entityNameLower}.use-case';
import { GetAll${entityNameCapitalized}UseCase } from '${entityPath}/application/use-cases/getAll-${entityNameLower}.use-case';
import { Delete${entityNameCapitalized}UseCase } from '${entityPath}/application/use-cases/delete-${entityNameLower}.use-case';
import { ${entityNameCapitalized}Mapper } from '${entityPath}/domain/mappers/${entityNameLower}.mapper';

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
})
export class ${entityNameCapitalized}Module {}
`.trim(),
      });

      await safeUpdateAppModule(entityNameLower);
    }
    await generateMiddlewares();

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
  } catch (error) {
    logError(`process currency have error: ${error}`);
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function decapitalize(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

module.exports = { setupCleanArchitecture };
