import { logInfo } from "./loggers/logInfo.js";
import { logSuccess } from "./loggers/logSuccess.js";
import { createDirectory, createFile, updateFile } from "./userInput.js";

export async function generateEntityFileContent(entity) {
  // console.log("Entity name:", entity.name); // Log de l'entité

  if (!entity || !entity.name) {
    throw new Error("Nom de l'entité manquant !");
  }
  const entityName = capitalize(entity.name);
  const className = `${entityName}Entity`;

  const defaultFields = [
    {
      name: "id",
      type: "string",
      comment:
        "L'identifiant unique de l'entité.\n * Utilisé pour retrouver de manière unique un enregistrement dans la base de données.\n *\n * Exemple : '123e4567-e89b-12d3-a456-426614174000'",
    },
    {
      name: "createdAt",
      type: "Date",
      comment:
        "La date de création de l'entité.\n * Définie lors de la création et ne change pas.\n *\n * Exemple : new Date('2022-01-01T10:00:00Z')",
    },
    {
      name: "updatedAt",
      type: "Date",
      comment:
        "La date de dernière mise à jour de l'entité.\n * Mise à jour à chaque modification.\n *\n * Exemple : new Date('2022-02-01T15:00:00Z')",
    },
  ];

  const isUserEntityWithRole =
    entity.name.toLowerCase() === "user" &&
    entity.fields.some((f) => f.name === "role");

  const allFields = [...defaultFields, ...entity.fields];

  const constructorParams = allFields
    .map(
      (f) => `
    /**
     * ${f.comment || `Champ ${f.name}`}
     */
    private readonly ${f.name}: ${getFormattedType(f)}
,`
    )
    .join("");

  const constructorAssignments = allFields
    .map((f) => `    this.${f.name} = ${f.name};`)
    .join("\n");

  const getters = allFields
    .map(
      (f) => `
  get${capitalize(f.name)}(): ${getFormattedType(f)}
 {
    return this.${f.name};
  }`
    )
    .join("\n");

  const jsonFields = allFields
    .map((f) => `      ${f.name}: this.${f.name},`)
    .join("\n");

  let importStatements = "";
  if (isUserEntityWithRole) {
    importStatements += `import { Role } from 'src/modules/user/domain/enums/role.enum';\n\n`;
  }

  return `${importStatements}/**
 * ${className} représente l'entité principale de ${entityName} dans le domaine.
 * Elle contient les propriétés de base nécessaires à la gestion des données liées à ${entityName}.
 */
export class ${className} {
  constructor(${constructorParams}
  ) {
${constructorAssignments}
  }
${getters}

  toJSON() {
    return {
${jsonFields}
    };
  }
}
`;
}

export async function generateMapper(entity) {
  const entityName = capitalize(entity.name);

  // verification de l'existance de user entity
  const isUserWithRole =
    entity.name.toLowerCase() === "user" &&
    entity.fields.some((f) => f.name.toLowerCase() === "role");

  const domainArgs = ["data.id"]
    .concat(["data.createdAt", "data.updatedAt"])
    .concat(entity.fields.map((f) => `data.${f.name}`))
    .join(",\n      ");

  const toPersistenceFields = entity.fields
    .map((f) => `${f.name}: dto.${f.name},`)
    .join("\n      ");

  const toUpdateFields = entity.fields
    .map(
      (f) => `if (dto.${f.name} !== undefined) data.${f.name} = dto.${f.name};`
    )
    .join("\n    ");

  return `
import { Injectable } from '@nestjs/common';
import { ${entityName}Entity } from 'src/${decapitalize(
    entity.name
  )}/domain/entities/${decapitalize(entity.name)}.entity';
import { Create${entityName}Dto, Update${entityName}Dto } from 'src/${
    entity.name
  }/application/dtos/${decapitalize(entity.name)}.dto';

 ${
   isUserWithRole
     ? "import { Role } from 'src/modules/user/domain/enums/role.enum';"
     : ""
 }


@Injectable()
export class ${entityName}Mapper {
  toDomain(data: any): ${entityName}Entity {
    return new ${entityName}Entity(
      ${domainArgs}
    );
  }

  toPersistence(dto: Create${entityName}Dto): any {
    return {
      ${toPersistenceFields}
    };
  }

  toUpdatePersistence(dto: Update${entityName}Dto): any {
    const data: any = {};
    ${toUpdateFields}
    return data;
  }
}
`;
}

export async function generateDto(entity) {
  const entityName = capitalize(entity.name);

  const getExampleForField = (f) => {
    // Dynamique et plus réaliste, basé sur le type de champ et des exemples courants
    switch (f.type) {
      case "string":
        return `"${f.name}_example"`; // Exemple générique basé sur le nom du champ
      case "number":
        return f.name === "price" ? 199.99 : 123; // Exemple spécifique pour 'price'
      case "boolean":
        return true; // Exemple générique pour les booléens
      case "Date":
      case "date":
        return `"2024-01-01T00:00:00Z"`; // Exemple générique pour les dates
      case "role":
        return `"user"`; // Exemple pour les rôles, par défaut 'user'
      case "discount":
        return 10; // Exemple pour une valeur de type discount
      case "account":
        return `"acc_${f.name}_12345"`; // Exemple pour un compte
      case "amount":
        return 500.75; // Exemple pour un montant
      default:
        return `"sample_${f.name}"`; // Fallback générique pour les autres types
    }
  };

  const generateFieldLine = (f) => {
    const typeDecorator =
      {
        string: "IsString",
        number: "IsInt",
        boolean: "IsBoolean",
        date: "IsDate",
      }[f.type] || "IsString";

    const apiPropertyDecorator = f.optional
      ? `@ApiPropertyOptional({ example: ${getExampleForField(f)}, type: '${
          f.type
        }' })`
      : `@ApiProperty({ example: ${getExampleForField(f)}, type: '${
          f.type
        }' })`;

    return `${apiPropertyDecorator}
  @${typeDecorator}()
  ${f.name}${f.optional ? "?" : ""}: ${f.type};`;
  };

  const dtoFields = entity.fields
    .map((f) => generateFieldLine({ ...f, optional: false }))
    .join("\n\n");

  const updateDtoFields = entity.fields
    .map((f) => generateFieldLine({ ...f, optional: true }))
    .join("\n\n");

  return `
import { IsOptional, IsString, IsInt, IsBoolean, IsDate } from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

// Vous pouvez décommenter ce champ si vous voulez gérer le rôle de l'utilisateur.
// import { Role } from 'src/modules/user/domain/enums/role.enum';

export class Create${entityName}Dto {
${dtoFields}

  // Décommentez et ajustez le rôle si nécessaire.
  // @ApiProperty({ example: 'admin', type: 'string' })
  // @IsString()
  // role: Role;
}

export class Update${entityName}Dto {
${updateDtoFields}

  // Décommentez et ajustez le rôle si nécessaire.
  // @ApiPropertyOptional({ example: 'admin', type: 'string' })
  // @IsString()
  // role?: Role;
}
`;
}

export async function generateMiddlewares() {
  logInfo(
    "\u2728 G\u00e9n\u00e9ration des middlewares, interceptors, guards et filters personnalis\u00e9s..."
  );

  const basePath = "src/common";
  await createDirectory(`${basePath}/middlewares`);
  await createDirectory(`${basePath}/interceptors`);
  await createDirectory(`${basePath}/filters`);
  await createDirectory(`${basePath}/decorators`);

  // Logger Middleware
  await createFile({
    path: `${basePath}/middlewares/logger.middleware.ts`,
    contente: `import { Request, Response, NextFunction } from 'express';

export function LoggerMiddleware(
  req: Request,
  res: Response,
  next: NextFunction,
) {
  console.log(\`[Request] \${req.method} \${req.originalUrl} - \${res.statusCode}\`);
  next();
}
`,
  });

  // Error Handling Filter
  await createFile({
    path: `${basePath}/filters/all-exceptions.filter.ts`,
    contente: `import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status = exception instanceof HttpException ? exception.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

    const message = exception instanceof HttpException ? exception.getResponse() : 'Internal server error';
    console.log('exception: ', exception);

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: message,
    });
  }
}`,
  });

  // Response Interceptor
  await createFile({
    path: `${basePath}/interceptors/response.interceptor.ts`,
    contente: `import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable()
export class ResponseInterceptor<T> implements NestInterceptor<T, any> {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const httpContext = context.switchToHttp();
    const response = httpContext.getResponse();
    const request = httpContext.getRequest();

    return next.handle().pipe(
      map((data) => {
        const message =
          response.locals.message || this.getDefaultMessage(request.method);

        return {
          statusCode: response.statusCode,
          message,
          path: request.url,
          method: request.method,
          timestamp: new Date().toISOString(),
          data: data ?? null,
        };
      }),
    );
  }

  private getDefaultMessage(method: string): string {
    switch (method.toUpperCase()) {
      case 'POST':
        return 'Création réussie';
      case 'PUT':
      case 'PATCH':
        return 'Mise à jour réussie';
      case 'DELETE':
        return 'Suppression réussie';
      default:
        return 'Requête traitée avec succès';
    }
  }
}
`,
  });

  // 📌 public Decorator
  await createFile({
    path: `${basePath}/decorators/public.decorator.ts`,
    contente: `import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
`,
  });

  // 📌 Auth role Decorator
  await createFile({
    path: `${basePath}/decorators/role.decorator.ts`,
    contente: `import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
`,
  });

  // Modification de main.ts pour intégrer les middlewares
  // Chemin vers main.ts
  const mainTsPath = "src/main.ts";

  // ✅ 1. Mise à jour des imports
  const importPattern = "import { AppModule } from './app.module';";
  const importReplacer = `import { AppModule } from 'src/app.module';
import { AllExceptionsFilter } from 'src/common/filters/all-exceptions.filter';
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor';
import { LoggerMiddleware } from 'src/common/middlewares/logger.middleware';
import { ValidationPipe } from '@nestjs/common';`;

  // ✅ 2. Injection dans le contenu de bootstrap()
  const contentPattern = `const app = await NestFactory.create(AppModule);`;
  const contentReplacer = `const app = await NestFactory.create(AppModule);

  // 🔒 Global filter pour gérer toutes les exceptions
  app.useGlobalFilters(new AllExceptionsFilter());

  // 🔁 Global interceptor pour structurer les réponses
  // app.useGlobalInterceptors(new ResponseInterceptor()); //deja appliquer dans le app.module.ts par convention (ne choisir que l'un des deux)

  // 📋 Middleware pour logger toutes les requêtes entrantes
  app.use(LoggerMiddleware);`;

  // ✅ Appels
  await updateFile({
    path: mainTsPath,
    pattern: importPattern,
    replacement: importReplacer,
  });

  await updateFile({
    path: mainTsPath,
    pattern: contentPattern,
    replacement: contentReplacer,
  });

  // modification de AppModule
  const appModulePath = "src/app.module.ts";

  const addNestModuleInterface = `providers: [`;
  const replaceWithNestModule = `providers: [
    {
      provide: APP_INTERCEPTOR,
      useClass: ResponseInterceptor,   // 🔁 Global interceptor pour structurer les réponses
    },`;

  await updateFile({
    path: appModulePath,
    pattern: addNestModuleInterface,
    replacement: replaceWithNestModule,
  });

  logSuccess(
    "\u2705 Middlewares, filters, interceptors et guards g\u00e9n\u00e9r\u00e9s avec succ\u00e8s !"
  );
}

export async function generateRepository(entityName, orm) {
  const entityNameCapitalized = capitalize(entityName);
  const entityNameLower = entityName.toLowerCase();
  const entityPath = `src/${entityNameLower}`;

  console.log(`entity name: ${entityNameLower} \n omr selected: ${orm}`);

  // Gère le switch en fonction de l'ORM choisi
  switch (orm) {
    case "typeorm":
      // Implémentation du repository pour TypeORM
      await createFile({
        path: `${entityPath}/infrastructure/repositories/${entityNameLower}.repository.ts`,
        contente: `import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ${entityNameCapitalized}Entity } from 'src/${entityNameLower}/domain/entities/${entityNameLower}.entity';
import { ${entityNameCapitalized} } from 'src/entities/${entityNameCapitalized}.entity';
import { I${entityNameCapitalized}Repository } from 'src/${entityNameLower}/application/interfaces/${entityNameLower}.repository.interface';
import { Create${entityNameCapitalized}Dto, Update${entityNameCapitalized}Dto } from 'src/${entityNameLower}/application/dtos/${entityNameLower}.dto';
import { ${entityNameCapitalized}Mapper } from 'src/${entityNameLower}/domain/mappers/${entityNameLower}.mapper';

@Injectable()
export class ${entityNameCapitalized}Repository implements I${entityNameCapitalized}Repository {
  constructor(
    @InjectRepository(${entityNameCapitalized})
    private readonly repository: Repository<${entityNameCapitalized}>,
    private readonly mapper: ${entityNameCapitalized}Mapper,
  ) {}

  // create
  async create(data: Create${entityNameCapitalized}Dto): Promise<${entityNameCapitalized}Entity> {
    const toPersist = this.mapper.toPersistence(data);
    const created = await this.repository.save(toPersist);
    return this.mapper.toDomain(created);
  }

  // find by id
  async findById(id: string): Promise<${entityNameCapitalized}Entity> {
    const record = await this.repository.findOne({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException(\`${entityNameCapitalized}Entity with id \${id} not found\`);
    }

    return this.mapper.toDomain(record);
  }

  // update
  async update(id: string, data: Update${entityNameCapitalized}Dto): Promise<${entityNameCapitalized}Entity> {
    const toUpdate = this.mapper.toUpdatePersistence(data);
    const updated = await this.repository.save({ ...toUpdate, id });
    return this.mapper.toDomain(updated);
  }

  // find all
  async findAll(): Promise<${entityNameCapitalized}Entity[]> {
    const records = await this.repository.find();
    return records.map(record => this.mapper.toDomain(record));
  }

  // delete
  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}
`,
      });
      break;

    case "prisma":
      // Implémentation pour Prisma
      await createFile({
        path: `${entityPath}/infrastructure/repositories/${entityNameLower}.repository.ts`,
        contente: `import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Create${entityNameCapitalized}Dto, Update${entityNameCapitalized}Dto } from 'src/${entityNameLower}/application/dtos/${entityNameLower}.dto';
import { I${entityNameCapitalized}Repository } from 'src/${entityNameLower}/application/interfaces/${entityNameLower}.repository.interface';
import { ${entityNameCapitalized}Entity } from 'src/${entityNameLower}/domain/entities/${entityNameLower}.entity';
import { ${entityNameCapitalized}Mapper } from 'src/${entityNameLower}/domain/mappers/${entityNameLower}.mapper';

@Injectable()
export class ${entityNameCapitalized}Repository implements I${entityNameCapitalized}Repository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly mapper: ${entityNameCapitalized}Mapper,
  ) {}

  // create
  async create(data: Create${entityNameCapitalized}Dto): Promise<${entityNameCapitalized}Entity> {
    const toPersist = this.mapper.toPersistence(data);
    const created = await this.prisma.${entityNameLower}.create({ data: toPersist });
    return this.mapper.toDomain(created);
  }

  // find by id
  async findById(id: string): Promise<${entityNameCapitalized}Entity> {
    const record = await this.prisma.${entityNameLower}.findUnique({
      where: { id },
    });

    if (!record) {
      throw new NotFoundException(\`${entityNameCapitalized}Entity with id \${id} not found\`);
    }

    return this.mapper.toDomain(record);
  }

  // update
  async update(id: string, data: Update${entityNameCapitalized}Dto): Promise<${entityNameCapitalized}Entity> {
    const toUpdate = this.mapper.toUpdatePersistence(data);
    const updated = await this.prisma.${entityNameLower}.update({
      where: { id },
      data: toUpdate,
    });

    return this.mapper.toDomain(updated);
  }

  // find all
  async findAll(): Promise<${entityNameCapitalized}Entity[]> {
    const records = await this.prisma.${entityNameLower}.findMany();
    return records.map(record => this.mapper.toDomain(record));
  }

  // delete
  async delete(id: string): Promise<void> {
    await this.prisma.${entityNameLower}.delete({
      where: { id },
    });
  }
}
`,
      });
      break;

    case "mongoose":
      // Implémentation pour MongoDB avec Mongoose
      await createFile({
        path: `${entityPath}/infrastructure/repositories/${entityNameLower}.repository.ts`,
        contente: `import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Create${entityNameCapitalized}Dto, Update${entityNameCapitalized}Dto } from 'src/${entityNameLower}/application/dtos/${entityNameLower}.dto';
import { I${entityNameCapitalized}Repository } from 'src/${entityNameLower}/application/interfaces/${entityNameLower}.repository.interface';
import { ${entityNameCapitalized}Entity } from 'src/${entityNameLower}/domain/entities/${entityNameLower}.entity';
import { ${entityNameCapitalized}Mapper } from 'src/${entityNameLower}/domain/mappers/${entityNameLower}.mapper';

@Injectable()
export class ${entityNameCapitalized}Repository implements I${entityNameCapitalized}Repository {
  constructor(
    @InjectModel(${entityNameCapitalized}Entity.name)
    private readonly model: Model<${entityNameCapitalized}Entity>,
    private readonly mapper: ${entityNameCapitalized}Mapper,
  ) {}

  // create
  async create(data: Create${entityNameCapitalized}Dto): Promise<${entityNameCapitalized}Entity> {
    const toPersist = this.mapper.toPersistence(data);
    const created = await this.model.create(toPersist);
    return this.mapper.toDomain(created);
  }

  // find by id
  async findById(id: string): Promise<${entityNameCapitalized}Entity> {
    const record = await this.model.findById(id);

    if (!record) {
      throw new NotFoundException(\`${entityNameCapitalized}Entity with id \${id} not found\`);
    }

    return this.mapper.toDomain(record);
  }

  // update
  async update(id: string, data: Update${entityNameCapitalized}Dto): Promise<${entityNameCapitalized}Entity> {
    const toUpdate = this.mapper.toUpdatePersistence(data);
    const updated = await this.model.findByIdAndUpdate(id, toUpdate, { new: true });
    return this.mapper.toDomain(updated);
  }

  // find all
  async findAll(): Promise<${entityNameCapitalized}Entity[]> {
    const records = await this.model.find();
    return records.map(record => this.mapper.toDomain(record));
  }

  // delete
  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }
}
`,
      });
      break;

    case "sequelize":
      // Implémentation pour Sequelize
      await createFile({
        path: `${entityPath}/infrastructure/repositories/${entityNameLower}.repository.ts`,
        contente: `import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/sequelize';
import { Model } from 'sequelize-typescript';
import { Create${entityNameCapitalized}Dto, Update${entityNameCapitalized}Dto } from 'src/${entityNameLower}/application/dtos/${entityNameLower}.dto';
import { I${entityNameCapitalized}Repository } from 'src/${entityNameLower}/application/interfaces/${entityNameLower}.repository.interface';
import { ${entityNameCapitalized}Entity } from 'src/${entityNameLower}/domain/entities/${entityNameLower}.entity';
import { ${entityNameCapitalized}Mapper } from 'src/${entityNameLower}/domain/mappers/${entityNameLower}.mapper';

@Injectable()
export class ${entityNameCapitalized}Repository implements I${entityNameCapitalized}Repository {
  constructor(
    @InjectModel(${entityNameCapitalized}Entity)
    private readonly model: Model<${entityNameCapitalized}Entity>,
    private readonly mapper: ${entityNameCapitalized}Mapper,
  ) {}

  // create
  async create(data: Create${entityNameCapitalized}Dto): Promise<${entityNameCapitalized}Entity> {
    const toPersist = this.mapper.toPersistence(data);
    const created = await this.model.create(toPersist);
    return this.mapper.toDomain(created);
  }

  // find by id
  async findById(id: string): Promise<${entityNameCapitalized}Entity> {
    const record = await this.model.findByPk(id);

    if (!record) {
      throw new NotFoundException(\`${entityNameCapitalized}Entity with id \${id} not found\`);
    }

    return this.mapper.toDomain(record);
  }

  // update
  async update(id: string, data: Update${entityNameCapitalized}Dto): Promise<${entityNameCapitalized}Entity> {
    const toUpdate = this.mapper.toUpdatePersistence(data);
    const updated = await this.model.update(toUpdate, { where: { id } });
    return this.mapper.toDomain(updated);
  }

  // find all
  async findAll(): Promise<${entityNameCapitalized}Entity[]> {
    const records = await this.model.findAll();
    return records.map(record => this.mapper.toDomain(record));
  }

  // delete
  async delete(id: string): Promise<void> {
    await this.model.destroy({ where: { id } });
  }
}
`,
      });
      break;

    default:
      console.error("Unsupported ORM: " + orm);
      break;
  }
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}
function decapitalize(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

function formatType(type) {
  switch (type) {
    case "number":
      return "number";
    case "boolean":
      return "boolean";
    case "Date":
      return "Date";
    default:
      return "string";
  }
}

function getFormattedType(field) {
  if (field.name === "role" && field.type === "string") {
    return "Role"; // 🔁 Remplacer le type string par Role
  }
  return formatType(field.type);
}
