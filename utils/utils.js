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

export async function generateDto(
  entity,
  useSwagger,
  isAuthDto = false,
  mode = "full"
) {
  const entityName = capitalize(entity.name);
  let enumImport = "";
  if (entityName === "User") {
    enumImport =
      mode === "light"
        ? "import { Role } from 'src/common/enums/role.enum';"
        : "import { Role } from 'src/user/domain/enums/role.enum';";
  }

  const getExampleForField = (f) => {
    const fieldName = f.name.toLowerCase();

    // 🚀 Cas spécifiques pour AUTH DTO (exemples réalistes)
    if (isAuthDto) {
      if (fieldName.includes("newpassword")) {
        return `"Password@123456"`;
      }
      if (fieldName.includes("password")) {
        return `"SecurePass@2024"`;
      }
      if (fieldName.includes("otp")) {
        return `"654321"`;
      }
      if (fieldName.includes("token")) {
        return `"eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIn0.dozjgNryP4J3jVmNHl0w5N_XgL0n3I9PlFUP0THsR8U"`;
      }
      if (fieldName.includes("email")) {
        return `"user@example.com"`;
      }
    }

    // 🎯 Patterns spécifiques aux noms de champs
    if (fieldName.includes("email")) {
      return `"alice.johnson@example.com"`;
    }
    if (fieldName.includes("password")) {
      return `"SecurePass@2024"`;
    }
    if (fieldName.includes("username")) {
      return `"john_doe"`;
    }
    if (fieldName.includes("firstname") || fieldName.includes("first_name")) {
      return `"John"`;
    }
    if (fieldName.includes("lastname") || fieldName.includes("last_name")) {
      return `"Doe"`;
    }
    if (fieldName.includes("phone")) {
      return `"+1234567890"`;
    }
    if (fieldName.includes("title")) {
      return `"Product Title"`;
    }
    if (fieldName.includes("name")) {
      return `"${entityName} Name"`;
    }
    if (fieldName.includes("description")) {
      return `"A detailed description of the item"`;
    }
    if (fieldName.includes("url") || fieldName.includes("image")) {
      return `"https://example.com/image.png"`;
    }
    if (fieldName.includes("price")) {
      return 99.99;
    }
    if (fieldName.includes("amount") || fieldName.includes("total")) {
      return 1500.5;
    }
    if (fieldName.includes("quantity") || fieldName.includes("count")) {
      return 5;
    }
    if (fieldName.includes("discount")) {
      return 15;
    }
    if (fieldName.includes("rate") || fieldName.includes("rating")) {
      return 4.5;
    }
    if (fieldName.includes("role")) {
      return `"admin"`;
    }
    if (fieldName.includes("status")) {
      return `"active"`;
    }
    if (fieldName.includes("type")) {
      return `"standard"`;
    }
    if (fieldName.includes("date") || fieldName.includes("at")) {
      return `"2024-12-01T10:30:00Z"`;
    }
    if (fieldName.includes("time")) {
      return `"14:30:00"`;
    }
    if (fieldName.includes("id") && fieldName !== "id") {
      return `"550e8400-e29b-41d4-a716-446655440000"`;
    }
    if (fieldName.includes("code")) {
      return `"CODE123456"`;
    }
    if (fieldName.includes("reference")) {
      return `"REF-2024-001"`;
    }

    // 🛠 Fallback selon le type
    switch (f.type.toLowerCase()) {
      case "string":
        return `"${entityName.toLowerCase()}_${f.name}"`;
      case "number":
      case "int":
        return 42;
      case "float":
        return 3.14;
      case "boolean":
        return true;
      case "date":
        return `"2024-01-15T08:00:00Z"`;
      default:
        return `"value"`;
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

    const swaggerDecorator = useSwagger
      ? f.optional
        ? `@ApiPropertyOptional({ example: ${getExampleForField(f)} })\n`
        : `@ApiProperty({ example: ${getExampleForField(f)}})\n`
      : "";

    return `${swaggerDecorator}  @${typeDecorator}()\n  ${f.name}${
      f.optional ? "?" : ""
    }: ${f.type};`;
  };

  const dtoFields = entity.fields
    .map((f) => generateFieldLine({ ...f, optional: false }))
    .join("\n\n");

  const updateDtoFields = entity.fields
    .map((f) => generateFieldLine({ ...f, optional: true }))
    .join("\n\n");

  const commonImports = `import { IsOptional, IsString, IsEnum, IsInt, IsBoolean, IsDate, MinLength } from 'class-validator';
${
  useSwagger
    ? "import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';"
    : ""
}
${enumImport}
`;

  // ✅ Cas AUTH DTO : une seule classe + nom déjà donné (pas de Create/Update)
  if (isAuthDto) {
    return `
${commonImports}

export class ${entityName}Dto {
${dtoFields}
}
`;
  }

  // ✅ Cas général : Create + Update
  return `
${commonImports}


export class Create${entityName}Dto {
${dtoFields}

   // Ajustez le rôle si nécessaire.
   ${
     useSwagger && entityName == "User"
       ? "@ApiPropertyOptional({ example: 'admin', type: 'string' })\n  "
       : ""
   }${
    useSwagger && entityName == "User"
      ? `@IsEnum(Role)
  role?: Role.ADMIN;
    `
      : ""
  }
}

export class Update${entityName}Dto {
${updateDtoFields}

   ${
     useSwagger && entityName == "User"
       ? "@ApiPropertyOptional({ example: 'admin', type: 'string' })\n  "
       : ""
   }${
    useSwagger && entityName == "User"
      ? `@IsEnum(Role)
  role?: Role.ADMIN;
    `
      : ""
  }
}
`;
}

export async function generateController(entityName, entityPath, useSwagger) {
  const entityNameLower = decapitalize(entityName);
  const entityNameCapitalized = capitalize(entityName);

  const swaggerImports = useSwagger
    ? `import { ApiTags, ApiOperation } from '@nestjs/swagger';`
    : "";

  const swaggerClassDecorator = useSwagger
    ? `@ApiTags('${entityNameCapitalized}')`
    : "";

  const swaggerMethodDecorator = (summary) =>
    useSwagger ? `@ApiOperation({ summary: '${summary}' })\n  ` : "";

  return `
/**
 * ${entityNameCapitalized}Controller gère les endpoints de l'API pour l'entité ${entityNameCapitalized}.
 * Il utilise les cas d'utilisation (Use Cases) pour orchestrer les différentes actions métiers liées à l'entité.
 */

import { Controller, Get, Post, Body, Param, Put, Delete, Injectable } from "@nestjs/common";
${swaggerImports}
import { ${entityNameCapitalized}Service } from '${entityPath}/infrastructure/services/${entityNameLower}.service';
import { Create${entityNameCapitalized}Dto, Update${entityNameCapitalized}Dto } from 'src/${entityNameLower}/application/dtos/${entityNameLower}.dto';

@Injectable()
${swaggerClassDecorator}
@Controller('${entityNameLower}')
export class ${entityNameCapitalized}Controller {
  constructor(private readonly service: ${entityNameCapitalized}Service) {}

  ${
    entityNameLower != "user"
      ? `// 📌 Créer un ${entityNameLower}
  @Post()
  ${swaggerMethodDecorator(`Create a new ${entityNameLower}`)}async create(
    @Body() dto: Create${entityNameCapitalized}Dto,
  ) {
    return await this.service.create(dto);
  }`
      : ""
  }

  // 📌 Mettre à jour un ${entityNameLower}
  @Put(':id')
  ${swaggerMethodDecorator(`Update a ${entityNameLower}`)}async update(
    @Param('id') id: string,
    @Body() dto: Update${entityNameCapitalized}Dto,
  ) {
    return await this.service.update(id, dto);
  }

  // 📌 Récupérer un ${entityNameLower} par ID
  @Get(':id')
  ${swaggerMethodDecorator(
    `Get a ${entityNameLower} by ID`
  )}async getById(@Param('id') id: string) {
    return await this.service.getById(id);
  }

  // 📌 Récupérer tous les ${entityNameLower}s
  @Get()
  ${swaggerMethodDecorator(`Get all ${entityNameLower}s`)}async getAll() {
    return await this.service.getAll();
  }

  // 📌 Supprimer un ${entityNameLower}
  @Delete(':id')
  ${swaggerMethodDecorator(
    `Delete a ${entityNameLower} by ID`
  )}async delete(@Param('id') id: string) {
    return await this.service.delete(id);
  }
}
`;
}

export async function generateMiddlewares(orm = "global") {
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

  // Error Handling Filter (personnalisé selon l'ORM)
  await createFile({
    path: `${basePath}/filters/all-exceptions.filter.ts`,
    contente: getExceptionFilterContent(orm),
  });
  // Error Handling Filter
  /*  await createFile({
    path: `${basePath}/filters/all-exceptions.filter.ts`,
    contente: `import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorDetails: any = null;

    // Handle NestJS HttpExceptions (BadRequest, NotFound, etc.)
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();

      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as any;
        message = resObj.message || resObj.error || 'HttpException';
        errorDetails = resObj;
      }
    }

    // Handle Prisma errors dynamiquement (sans import bloquant)
    else if (
      typeof exception === 'object' &&
      exception &&
      exception.constructor &&
      (
        exception.constructor.name === 'PrismaClientKnownRequestError' ||
        exception.constructor.name === 'PrismaClientValidationError'
      )
    ) {
      status = HttpStatus.BAD_REQUEST;
      message = (exception as any).message || 'Prisma error';
      errorDetails = exception;
    }

    // Handle Mongoose/Mongo errors dynamiquement
    else if (
      typeof exception === 'object' &&
      exception &&
      'name' in exception &&
      (
        (exception as any).name === 'MongoError' ||
        (exception as any).name === 'MongooseError'
      )
    ) {
      status = HttpStatus.BAD_REQUEST;
      message = (exception as any).message || 'MongoDB error';
      errorDetails = exception;
    }

    // Handle Sequelize errors dynamiquement
    else if (
      typeof exception === 'object' &&
      exception &&
      exception.constructor &&
      (
        exception.constructor.name === 'SequelizeDatabaseError' ||
        exception.constructor.name === 'SequelizeValidationError'
      )
    ) {
      status = HttpStatus.BAD_REQUEST;
      message = (exception as any).message || 'Sequelize error';
      errorDetails = exception;
    }

    // Handle unknown errors
    else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = {
        name: exception.name,
        stack: exception.stack,
      };
    } else {
      message = 'Une erreur inattendue est survenue';
      errorDetails = exception;
    }

    // Log the full exception on the server
    this.logger.error(
      \`Exception on \${request.method} \${request.url}\`,
      JSON.stringify({
        message,
        status,
        errorDetails,
        exception,
      }),
    );

    // Send clean error to client
    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error: errorDetails,
    });
  }
}
`,
  }); */

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
  const importReplacer = `import { AppModule } from 'src/app.module'
import { AllExceptionsFilter } from 'src/common/filters/all-exceptions.filter'
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor'
import { LoggerMiddleware } from 'src/common/middlewares/logger.middleware'
import { ValidationPipe } from '@nestjs/common';`;

  // ✅ 2. Injection dans le contenu de bootstrap()
  const contentPattern = `const app = await NestFactory.create(AppModule);`;

  const contentReplacer = `

  // 🔒 Global filter pour gérer toutes les exceptions
  app.useGlobalFilters(new AllExceptionsFilter())

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
import { ${entityNameCapitalized}Entity } from '${entityPath}/domain/entities/${entityNameLower}.entity';
import { Create${entityNameCapitalized}Dto, Update${entityNameCapitalized}Dto } from 'src/${entityNameLower}/application/dtos/${entityNameLower}.dto';
import { I${entityNameCapitalized}Repository } from 'src/${entityNameLower}/application/interfaces/${entityNameLower}.repository.interface';
import { ${entityNameCapitalized} } from 'src/${entityNameLower}/domain/entities/${entityNameLower}.schema';
import { ${entityNameCapitalized}Mapper } from 'src/${entityNameLower}/domain/mappers/${entityNameLower}.mapper';

@Injectable()
export class ${entityNameCapitalized}Repository implements I${entityNameCapitalized}Repository {
  constructor(
    @InjectModel(${entityNameCapitalized}.name)
    private readonly model: Model<${entityNameCapitalized}>,
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

export async function generateMongooseSchemaFileContent(entity) {
  const entityName = capitalize(entity.name);
  const fields = entity.fields
    .map((f) => `  @Prop()\n  ${f.name}: ${formatType(f.type)};`)
    .join("\n");
  return `
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

@Schema()
export class ${entityName} extends Document {
${fields}
}

export const ${entityName}Schema = SchemaFactory.createForClass(${entityName});
`.trim();
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

// Génère le contenu du filtre d'exception selon l'ORM
function getExceptionFilterContent(orm) {
  if (orm === "prisma") {
    return `
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as any;
        message = resObj.message || resObj.error || 'HttpException';
        errorDetails = resObj;
      }
    } else if (
      typeof exception === 'object' &&
      exception &&
      exception.constructor &&
      (
        exception.constructor.name === 'PrismaClientKnownRequestError' ||
        exception.constructor.name === 'PrismaClientValidationError'
      )
    ) {
      status = HttpStatus.BAD_REQUEST;
      message = (exception as any).message || 'Prisma error';
      errorDetails = exception;
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = {
        name: exception.name,
        stack: exception.stack,
      };
    } else {
      message = 'Une erreur inattendue est survenue';
      errorDetails = exception;
    }

    this.logger.error(
      \`Exception on \${request.method} \${request.url}\`,
      JSON.stringify({ message, status, errorDetails, exception }),
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error: errorDetails,
    });
  }
}
`.trim();
  }

  if (orm === "mongoose") {
    return `
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as any;
        message = resObj.message || resObj.error || 'HttpException';
        errorDetails = resObj;
      }
    } else if (
      typeof exception === 'object' &&
      exception &&
      'name' in exception &&
      (
        (exception as any).name === 'MongoError' ||
        (exception as any).name === 'MongooseError'
      )
    ) {
      status = HttpStatus.BAD_REQUEST;
      message = (exception as any).message || 'MongoDB error';
      errorDetails = exception;
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = {
        name: exception.name,
        stack: exception.stack,
      };
    } else {
      message = 'Une erreur inattendue est survenue';
      errorDetails = exception;
    }

    this.logger.error(
      \`Exception on \${request.method} \${request.url}\`,
      JSON.stringify({ message, status, errorDetails, exception }),
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error: errorDetails,
    });
  }
}
`.trim();
  }

  if (orm === "typeorm") {
    return `
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as any;
        message = resObj.message || resObj.error || 'HttpException';
        errorDetails = resObj;
      }
    } else if (
      typeof exception === 'object' &&
      exception &&
      'name' in exception &&
      (
        (exception as any).name === 'QueryFailedError' ||
        (exception as any).name === 'EntityNotFoundError' ||
        (exception as any).name === 'CannotCreateEntityIdMapError'
      )
    ) {
      status = HttpStatus.BAD_REQUEST;
      message = (exception as any).message || 'TypeORM error';
      errorDetails = exception;
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = {
        name: exception.name,
        stack: exception.stack,
      };
    } else {
      message = 'Une erreur inattendue est survenue';
      errorDetails = exception;
    }

    this.logger.error(
      \`Exception on \${request.method} \${request.url}\`,
      JSON.stringify({ message, status, errorDetails, exception }),
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error: errorDetails,
    });
  }
}
`.trim();
  }

  if (orm === "sequelize") {
    return `
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as any;
        message = resObj.message || resObj.error || 'HttpException';
        errorDetails = resObj;
      }
    } else if (
      typeof exception === 'object' &&
      exception &&
      exception.constructor &&
      (
        exception.constructor.name === 'SequelizeDatabaseError' ||
        exception.constructor.name === 'SequelizeValidationError'
      )
    ) {
      status = HttpStatus.BAD_REQUEST;
      message = (exception as any).message || 'Sequelize error';
      errorDetails = exception;
    } else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = {
        name: exception.name,
        stack: exception.stack,
      };
    } else {
      message = 'Une erreur inattendue est survenue';
      errorDetails = exception;
    }

    this.logger.error(
      \`Exception on \${request.method} \${request.url}\`,
      JSON.stringify({ message, status, errorDetails, exception }),
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error: errorDetails,
    });
  }
}
`.trim();
  }

  // Version universelle (multi-ORM)
  return `
import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: string | string[] = 'Internal server error';
    let errorDetails: any = null;

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const res = exception.getResponse();
      if (typeof res === 'string') {
        message = res;
      } else if (typeof res === 'object' && res !== null) {
        const resObj = res as any;
        message = resObj.message || resObj.error || 'HttpException';
        errorDetails = resObj;
      }
    }
    // Prisma
    else if (
      typeof exception === 'object' &&
      exception &&
      exception.constructor &&
      (
        exception.constructor.name === 'PrismaClientKnownRequestError' ||
        exception.constructor.name === 'PrismaClientValidationError'
      )
    ) {
      status = HttpStatus.BAD_REQUEST;
      message = (exception as any).message || 'Prisma error';
      errorDetails = exception;
    }
    // Mongoose/Mongo
    else if (
      typeof exception === 'object' &&
      exception &&
      'name' in exception &&
      (
        (exception as any).name === 'MongoError' ||
        (exception as any).name === 'MongooseError'
      )
    ) {
      status = HttpStatus.BAD_REQUEST;
      message = (exception as any).message || 'MongoDB error';
      errorDetails = exception;
    }
    // Sequelize
    else if (
      typeof exception === 'object' &&
      exception &&
      exception.constructor &&
      (
        exception.constructor.name === 'SequelizeDatabaseError' ||
        exception.constructor.name === 'SequelizeValidationError'
      )
    ) {
      status = HttpStatus.BAD_REQUEST;
      message = (exception as any).message || 'Sequelize error';
      errorDetails = exception;
    }
    else if (exception instanceof Error) {
      message = exception.message;
      errorDetails = {
        name: exception.name,
        stack: exception.stack,
      };
    } else {
      message = 'Une erreur inattendue est survenue';
      errorDetails = exception;
    }

    this.logger.error(
      \`Exception on \${request.method} \${request.url}\`,
      JSON.stringify({ message, status, errorDetails, exception }),
    );

    response.status(status).json({
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      message,
      error: errorDetails,
    });
  }
}
`.trim();
}
