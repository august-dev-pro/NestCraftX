import { logInfo } from "./loggers/logInfo.js";
import { logSuccess } from "./loggers/logSuccess.js";
import { createDirectory, createFile, updateFile } from "./userInput.js";
import inquirer from "inquirer";
const actualInquirer = inquirer.default || inquirer;

export async function generateEntityFileContent(entity, mode = "full") {
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
  // 1. Types de base autorisés dans une Entité de Domaine
  const DOMAIN_SCALAR_TYPES = [
    "string",
    "number",
    "boolean",
    "date",
    "json",
    "text",
    "uuid",
    "decimal",
    "float",
    "int",
    "role",
  ];

  // 2. Filtrage : On ne garde que les types scalaires ou les IDs techniques
  const filteredFields = entity.fields.filter((f) => {
    const typeLower = f.type.toLowerCase().replace("[]", "");
    return DOMAIN_SCALAR_TYPES.includes(typeLower) || f.name.endsWith("Id");
  });

  const isUserEntityWithRole =
    entity.name.toLowerCase() === "user" &&
    entity.fields.some((f) => f.name === "role");

  const allFields = [...defaultFields, ...filteredFields];

  const constructorParams = allFields
    .map(
      (f) => `
    private readonly ${f.name}: ${getFormattedType(f)},`
    )
    .join("");

  /*   const constructorAssignments = allFields
    .map((f) => `    this.${f.name} = ${f.name};`)
    .join("\n"); */

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
    importStatements +=
      mode == "full"
        ? `import { Role } from 'src/user/domain/enums/role.enum';\n\n`
        : `import { Role } from 'src/common/enums/role.enum'; \n\n`;
  }

  return `${importStatements}/**
 * ${className} représente l'entité principale de ${entityName} dans le domaine.
 * Elle contient les propriétés de base nécessaires à la gestion des données liées à ${entityName}.
 */
export class ${className} {
  constructor(${constructorParams}
  ) {}
${getters}

  /**
 * transforme entity data to json
 */
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

  // 1. Liste des types autorisés (Scalaires / Primitifs)
  const SCALAR_TYPES = [
    "string",
    "text",
    "uuid",
    "json",
    "number",
    "int",
    "float",
    "decimal",
    "boolean",
    "date",
    "role",
  ];

  // 2. Fonction de filtrage cohérente
  const filterDomainFields = (f) => {
    const typeName = f.type.toLowerCase().replace("[]", "");
    return (
      SCALAR_TYPES.includes(typeName) || f.name.toLowerCase().endsWith("id")
    );
  };

  // 3. Filtrage des champs pour le constructeur de l'Entity
  // On ne passe au constructeur QUE ce qui est filtré
  const filteredFields = entity.fields.filter(filterDomainFields);

  const domainArgs = ["data.id"]
    .concat(["data.createdAt", "data.updatedAt"])
    .concat(filteredFields.map((f) => `data.${f.name}`)) // UTILISE LES CHAMPS FILTRÉS ICI
    .join(",\n    ");

  // 4. Filtrage pour la persistence (Base de données)
  const toPersistenceFields = filteredFields
    .map((f) => `${f.name}: dto.${f.name},`)
    .join("\n    ");

  const toUpdateFields = filteredFields
    .map(
      (f) => `if (dto.${f.name} !== undefined) data.${f.name} = dto.${f.name};`
    )
    .join("\n   ");

  // ... (Logique isUserWithRole inchangée)

  return `/**
 * PostMapper transforms data between
 * different layers (Persistence <-> Domain <-> DTO).
 *
 * Ensures that the internal database structure
 * never leaks into the API responses.
 */

import { Injectable } from '@nestjs/common';
import { ${entityName}Entity } from 'src/${decapitalize(
    entity.name
  )}/domain/entities/${decapitalize(entity.name)}.entity';
import { Create${entityName}Dto, Update${entityName}Dto } from 'src/${decapitalize(
    entity.name
  )}/application/dtos/${decapitalize(entity.name)}.dto';

@Injectable()
export class ${entityName}Mapper {

  /**
   * Transforme les données (Prisma/TypeORM) en Entité de Domaine
   */
  toDomain(data: any): ${entityName}Entity {
    return new ${entityName}Entity(
      ${domainArgs}
    );
  }

  /**
   * Transforme le DTO en objet pour la création en base de données
   */
  toPersistence(dto: Create${entityName}Dto): any {
    return {
      ${toPersistenceFields}
    };
  }

  /**
   * Prépare l'objet de mise à jour partielle
   */
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

  /* const getExampleForField = (f) => {
    const fieldName = f.name.toLowerCase();

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

    switch (f.type.toLowerCase().replace("[]", "")) {
      case "string":
      case "text":
      case "uuid":
      case "json":
        return `"${entityName.toLowerCase()}_${f.name}"`;
      case "number":
      case "int":
      case "decimal":
      case "float":
        return 42;
      case "boolean":
        return true;
      case "date":
        return `"2024-01-15T08:00:00Z"`;
      default:
        return `"value"`;
    }
  }; */

  const getExampleForField = (f) => {
    const fieldName = f.name.toLowerCase();
    const isArray = f.type.endsWith("[]");
    const cleanType = f.type.toLowerCase().replace("[]", "");

    // 1. Logique pour obtenir une valeur de base (SANS le tableau)
    const getBaseExample = () => {
      // --- Priorité aux noms de champs (Auth & Common) ---
      if (fieldName.includes("email")) return `"user@example.com"`;
      if (fieldName.includes("password")) return `"SecurePass@2024"`;
      if (fieldName.includes("token")) return `"eyJhbGciOi..."`;
      if (fieldName.includes("id") && fieldName !== "id")
        return `"550e8400-e29b-41d4-a716-446655440000"`;

      if (fieldName.includes("title") || fieldName.includes("name"))
        return `"${capitalize(entityName)} Example"`;
      if (fieldName.includes("description"))
        return `"A detailed description example"`;
      if (fieldName.includes("url") || fieldName.includes("image"))
        return `"https://example.com/image.png"`;

      if (fieldName.includes("price") || fieldName.includes("amount"))
        return 99.99;
      if (fieldName.includes("quantity") || fieldName.includes("count"))
        return 10;
      if (fieldName.includes("status") || fieldName.includes("type"))
        return `"active"`;
      if (fieldName.includes("date") || fieldName.includes("at"))
        return `"2024-12-01T10:30:00Z"`;

      // --- Logique par Type ---
      switch (cleanType) {
        case "string":
        case "text":
        case "uuid":
          return `"${f.name.toLowerCase()}_val"`;
        case "number":
        case "int":
        case "decimal":
        case "float":
          return 42;
        case "boolean":
          return true;
        case "json":
          // IMPORTANT: On retourne un objet littéral (sous forme de string pour le template)
          return `{ "key": "value", "active": true }`;
        case "date":
          return `"2024-01-15T08:00:00Z"`;
        default:
          return `"value"`;
      }
    };

    const baseValue = getBaseExample();

    // 2. Si c'est un tableau, on enveloppe la valeur de base
    if (isArray) {
      // On retourne deux exemples pour montrer que c'est une liste
      return `[${baseValue}, ${baseValue}]`;
    }

    return baseValue;
  };

  // Géneration de ligne de champ DTO
  const generateFieldLine = (f, isRequestDto = false) => {
    if (entityName === "User" && f.name.toLowerCase() === "role") {
      return null;
    }

    const field = { ...f };
    const rawType = field.type;
    const cleanType = rawType.toLowerCase().replace("[]", "");
    const isArrayType = rawType.endsWith("[]");

    const SCALAR_TYPES = [
      "string",
      "text",
      "uuid",
      "json",
      "number",
      "decimal",
      "int",
      "float",
      "boolean",
      "date",
      "role",
      "enum",
    ];

    const isRelation = !SCALAR_TYPES.includes(cleanType);

    let tsType;
    let typeDecorator;
    let swaggerDecorator = "";
    let swaggerBaseType = "";

    // 1. GESTION DES RELATIONS
    if (isRelation) {
      const baseTypeName = capitalize(rawType.replace("[]", ""));
      const isForeignKey = field.name.toLowerCase().endsWith("id");

      if (isRequestDto) {
        if (!isForeignKey) {
          return null;
        }
        tsType = "string";
        typeDecorator = "IsUUID()";

        swaggerDecorator = useSwagger
          ? field.optional
            ? `@ApiPropertyOptional({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })\n`
            : `@ApiProperty({ example: "550e8400-e29b-41d4-a716-446655440000", type: String })\n`
          : "";
      } else {
        if (isForeignKey) {
          return null;
        }
        tsType = isArrayType ? `${baseTypeName}Dto[]` : `${baseTypeName}Dto`;

        typeDecorator = `ValidateNested({ each: ${isArrayType} })\n @Type(() => ${baseTypeName}Dto)`;
        if (field.optional) typeDecorator = `IsOptional()\n @${typeDecorator}`;

        swaggerDecorator = useSwagger
          ? field.optional
            ? `@ApiPropertyOptional({ type: () => ${baseTypeName}Dto, ${
                isArrayType ? "isArray: true" : ""
              } })\n`
            : `@ApiProperty({ type: () => ${baseTypeName}Dto, ${
                isArrayType ? "isArray: true" : ""
              } })\n`
          : "";
      }
    }

    // 2. GESTION DES TYPES SCALAIRES
    else {
      // Utilise formatType pour obtenir le type TS final
      tsType = formatType(rawType);

      let validator;
      switch (cleanType) {
        case "string":
        case "text":
          validator = "IsString";
          swaggerBaseType = "String";
          break;
        case "uuid":
          validator = "IsUUID";
          swaggerBaseType = "String";
          break;
        case "json":
          validator = "IsObject";
          tsType = isArrayType
            ? `Record<string, any>[]`
            : `Record<string, any>`;
          swaggerBaseType = "Object";
          break;
        case "number":
        case "decimal":
        case "float":
          validator = "IsNumber";
          swaggerBaseType = "Number";
          break;
        case "int":
          validator = "IsInt";
          swaggerBaseType = "Number";
          break;
        case "boolean":
          validator = "IsBoolean";
          swaggerBaseType = "Boolean";
          break;
        case "date":
          validator = "IsDateString";
          swaggerBaseType = "String";
          break;
        case "role":
          validator = "IsEnum(Role)";
          swaggerBaseType = "String";
          break;
        case "enum":
          validator = `IsEnum(${rawType.replace("[]", "")})`;
          swaggerBaseType = "String";
          break;
        default:
          validator = "IsString";
          swaggerBaseType = "String";
      }

      // 1. Ajout des parenthèses pour les validateurs scalaires simples (ex: IsObject -> IsObject())
      if (!isArrayType && !validator.includes("(")) {
        validator = `${validator}()`;
      }

      // Gère les tableaux de types scalaires et d'Enums
      if (isArrayType) {
        if (rawType.toLowerCase().includes("enum")) {
          validator = `IsArray()\n@IsEnum(${rawType.replace(
            "[]",
            ""
          )}, { each: true })`;
        } else {
          // Pour les scalaires simples (string[], number[])
          const baseValidatorName = validator.replace("()", ""); // Retire les parenthèses ()

          validator = `IsArray()\n@${baseValidatorName}({ each: true })`;
        }
      }

      typeDecorator = validator;

      if (field.optional) typeDecorator = `IsOptional()\n@${typeDecorator}`;

      // Swagger pour Scalaires
      const swaggerProp = isArrayType
        ? `type: ${swaggerBaseType}, isArray: true`
        : `type: ${swaggerBaseType}`;

      swaggerDecorator = useSwagger
        ? field.optional
          ? `@ApiPropertyOptional({ example: ${getExampleForField(
              field
            )}, ${swaggerProp} })\n`
          : `@ApiProperty({ example: ${getExampleForField(
              field
            )}, ${swaggerProp} })\n`
        : "";
    }

    if (!field.name) return null;

    return `${swaggerDecorator} @${typeDecorator}\n ${field.name}${
      field.optional ? "?" : ""
    }: ${tsType};`;
  };

  // UTILISATION DE 'true' pour indiquer que ce sont des DTOs de REQUÊTE
  const dtoFields = entity.fields
    .map((f) => generateFieldLine({ ...f, optional: false }, true))
    .filter(Boolean)
    .join("\n\n");

  const updateDtoFields = entity.fields
    .map((f) => generateFieldLine({ ...f, optional: true }, true))
    .filter(Boolean)
    .join("\n\n");

  const commonImports = `import { IsOptional, IsString, IsEnum, IsInt, IsBoolean, IsDate, MinLength, IsArray, IsUUID, IsObject, IsNumber, IsDateString, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';
${
  useSwagger
    ? "import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';"
    : ""
}
${enumImport}
`;

  if (isAuthDto) {
    return `
${commonImports}

export class ${entityName}Dto {
${dtoFields}
}
`;
  }

  return `
${commonImports}

export class Create${entityName}Dto {
${dtoFields}
${
  entityName === "User"
    ? `\n  ${
        useSwagger
          ? "@ApiPropertyOptional({ example: 'USER', enum: Role, default: Role.USER })\n  "
          : ""
      }@IsEnum(Role)\n  @IsOptional()\n  role: Role;`
    : ""
}
}

export class Update${entityName}Dto {
${updateDtoFields}
${
  entityName === "User"
    ? `\n  ${
        useSwagger
          ? "@ApiPropertyOptional({ example: 'USER', enum: Role })\n  "
          : ""
      }@IsEnum(Role)\n  @IsOptional()\n  role?: Role;`
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
    ? `@ApiTags('${entityNameLower}')`
    : "";

  const swaggerMethodDecorator = (summary) =>
    useSwagger ? `@ApiOperation({ summary: '${summary}' })\n  ` : "";

  return `
/**
 * ${entityNameCapitalized}Controller handles HTTP endpoints
 * for the ${entityNameCapitalized} entity.
 *
 * This controller is responsible only for:
 * - HTTP transport
 * - Request/response handling
 * - Returning API messages
 *
 * Business logic is delegated to the service layer.
 */

import { Controller, Get, Post, Body, Param, Put, Delete } from '@nestjs/common';
${swaggerImports}
import { ${entityNameCapitalized}Service } from '${entityPath}/application/services/${entityNameLower}.service';
import { Create${entityNameCapitalized}Dto, Update${entityNameCapitalized}Dto } from 'src/${entityNameLower}/application/dtos/${entityNameLower}.dto';

${swaggerClassDecorator}
@Controller('${pluralize(entityNameLower)}')
export class ${entityNameCapitalized}Controller {
  constructor(private readonly service: ${entityNameCapitalized}Service) {}

  ${
    entityNameLower !== "user"
      ? `
  // Create a new ${entityNameLower}
  @Post()
  ${swaggerMethodDecorator(`Create a new ${entityNameLower}`)}
  async create(@Body() dto: Create${entityNameCapitalized}Dto) {
    await this.service.create(dto);
    return { message: '${entityNameCapitalized} created successfully' };
  }
  `
      : ""
  }

  // Update an existing ${entityNameLower}
  @Put(':id')
  ${swaggerMethodDecorator(`Update a ${entityNameLower}`)}
  async update(
    @Param('id') id: string,
    @Body() dto: Update${entityNameCapitalized}Dto,
  ) {
    await this.service.update(id, dto);
    return { message: '${entityNameCapitalized} updated successfully' };
  }

  // Get a ${entityNameLower} by ID
  @Get(':id')
  ${swaggerMethodDecorator(`Get a ${entityNameLower} by ID`)}
  async getById(@Param('id') id: string) {
    return await this.service.getById(id);
  }

  // Get all ${pluralize(entityNameLower)}
  @Get()
  ${swaggerMethodDecorator(`Get all ${pluralize(entityNameLower)}`)}
  async getAll() {
    return await this.service.getAll();
  }

  // Delete a ${entityNameLower}
  @Delete(':id')
  ${swaggerMethodDecorator(`Delete a ${entityNameLower} by ID`)}
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
    return { message: '${entityNameCapitalized} deleted successfully' };
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
  if (process.env.NODE_ENV === 'production') {
    return next();
  }

  res.on('finish', () => {
    console.log(
      \`[Request] \${req.method} \${req.originalUrl} - \${res.statusCode}\`,
    );
  });

  next();
}
`,
  });

  // Error Handling Filter (personnalisé selon l'ORM)
  await createFile({
    path: `${basePath}/filters/all-exceptions.filter.ts`,
    contente: getExceptionFilterContent(orm),
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
        return 'Resource created successfully';
      case 'PUT':
      case 'PATCH':
        return 'Resource updated successfully';
      case 'DELETE':
        return 'Resource deleted successfully';
      case 'GET':
        return 'Request processed successfully';
      default:
        return 'Request processed successfully';
    }
  }
}
`,
  });

  // public Decorator
  await createFile({
    path: `${basePath}/decorators/public.decorator.ts`,
    contente: `import { SetMetadata } from '@nestjs/common';

export const IS_PUBLIC_KEY = 'isPublic';
export const Public = () => SetMetadata(IS_PUBLIC_KEY, true);
`,
  });

  await createFile({
    path: `${basePath}/decorators/current-user.decorator.ts`,
    contente: `import { createParamDecorator, ExecutionContext } from '@nestjs/common';\nexport const CurrentUser = createParamDecorator((data, ctx: ExecutionContext) => ctx.switchToHttp().getRequest().user);`,
  });

  // Auth role Decorator
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

  //  1. Mise à jour des imports
  const importPattern = "import { AppModule } from './app.module';";
  const importReplacer = `import { AppModule } from 'src/app.module'
import { AllExceptionsFilter } from 'src/common/filters/all-exceptions.filter'
import { ResponseInterceptor } from 'src/common/interceptors/response.interceptor'
import { LoggerMiddleware } from 'src/common/middlewares/logger.middleware'
import { ValidationPipe } from '@nestjs/common';`;

  //  2. Injection dans le contenu de bootstrap()
  const contentPattern = `const app = await NestFactory.create(AppModule);`;

  const contentReplacer = `
  const app = await NestFactory.create(AppModule);

  // 🔒 Global filter pour gérer toutes les exceptions
  app.useGlobalFilters(new AllExceptionsFilter())

  // 🔁 Global interceptor pour structurer les réponses
  // app.useGlobalInterceptors(new ResponseInterceptor()); //deja appliquer dans le app.module.ts par convention (ne choisir que l'un des deux)

  // 📋 Middleware pour logger toutes les requêtes entrantes
  app.use(LoggerMiddleware);`;

  //  Appels
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

  // Générateur de méthode spécifique (ex: findByEmail pour Auth)
  const isUser = entityNameLower === "user";
  const getExtraMethods = (ormType) => {
    if (!isUser) return "";

    switch (ormType) {
      case "typeorm":
        return `
async findByEmail(email: string): Promise<${entityNameCapitalized}Entity | null> {
  const record = await this.repository.findOne({ where: { email } as any });
  return record ? this.mapper.toDomain(record) : null;
}`;
      case "prisma":
        return `
async findByEmail(email: string): Promise<${entityNameCapitalized}Entity | null> {
  const record = await this.prisma.${entityNameLower}.findFirst({ where: { email } });
  return record ? this.mapper.toDomain(record) : null;
}`;
      case "mongoose":
        return `
async findByEmail(email: string): Promise<${entityNameCapitalized}Entity | null> {
  const record = await this.model.findOne({ email }).exec();
  return record ? this.mapper.toDomain(record) : null;
}`;
      case "sequelize":
        return `
async findByEmail(email: string): Promise<${entityNameCapitalized}Entity | null> {
  const record = await this.model.findOne({ where: { email } });
  return record ? this.mapper.toDomain(record) : null;
}`;
      default:
        return "";
    }
  };

  const extraMethods = getExtraMethods(orm);

  // Gère le switch en fonction de l'ORM choisi
  switch (orm) {
    case "typeorm":
      // Implémentation du repository pour TypeORM
      await createFile({
        path: `${entityPath}/infrastructure/repositories/${entityNameLower}.repository.ts`,
        contente: `/**
 * PostRepository handles data persistence
 * for the Post entity.
 *
 * This layer abstracts the database engine (Prisma/TypeORM)
 * and provides a clean interface for data operations.
 */

import { Injectable, NotFoundException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ${entityNameCapitalized}Entity } from 'src/${entityNameLower}/domain/entities/${entityNameLower}.entity';
import { ${entityNameCapitalized} } from 'src/entities/${entityNameCapitalized}.entity';
import { I${entityNameCapitalized}Repository } from 'src/${entityNameLower}/domain/interfaces/${entityNameLower}.repository.interface';
import { Create${entityNameCapitalized}Dto, Update${entityNameCapitalized}Dto } from 'src/${entityNameLower}/application/dtos/${entityNameLower}.dto';
import { ${entityNameCapitalized}Mapper } from 'src/${entityNameLower}/infrastructure/mappers/${entityNameLower}.mapper';

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

  ${extraMethods}

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
import { I${entityNameCapitalized}Repository } from 'src/${entityNameLower}/domain/interfaces/${entityNameLower}.repository.interface';
import { ${entityNameCapitalized}Entity } from 'src/${entityNameLower}/domain/entities/${entityNameLower}.entity';
import { ${entityNameCapitalized}Mapper } from 'src/${entityNameLower}/infrastructure/mappers/${entityNameLower}.mapper';

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

  ${extraMethods}

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
import { I${entityNameCapitalized}Repository } from 'src/${entityNameLower}/domain/interfaces/${entityNameLower}.repository.interface';
import { ${entityNameCapitalized} } from 'src/${entityNameLower}/domain/entities/${entityNameLower}.schema';
import { ${entityNameCapitalized}Mapper } from 'src/${entityNameLower}/infrastructure/mappers/${entityNameLower}.mapper';

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

  ${extraMethods}

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
import { I${entityNameCapitalized}Repository } from 'src/${entityNameLower}/domain/interfaces/${entityNameLower}.repository.interface';
import { ${entityNameCapitalized}Entity } from 'src/${entityNameLower}/domain/entities/${entityNameLower}.entity';
import { ${entityNameCapitalized}Mapper } from 'src/${entityNameLower}/infrastructure/mappers/${entityNameLower}.mapper';

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

  ${extraMethods}

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

/**
 * Mappe le type de champ interne (sélectionné par l'utilisateur) au type
 * TypeScript ou DTO/Classe/Enum correspondant pour la génération de code.
 *
 * @param {string} type - Le type de base sélectionné (string, number, array, DTO, Enum, etc.)
 * @returns {string} Le type formaté pour la génération de code (ex: 'string', 'number', 'Article[]', 'UserRoleEnum')
 */
function formatType(type) {
  // 1. Gestion des types simples
  switch (type.toLowerCase()) {
    case "number":
    case "decimal":
      return "number";

    case "boolean":
      return "boolean";

    case "date":
      return "Date";

    case "json":
      return "Record<string, any>";

    case "string":
    case "text":
    case "uuid":
      return "string";
  }

  //2. Vérifie si c'est un Array
  // Gère les Arrays de scalaires (ex: 'string[]')
  if (type.endsWith("[]")) {
    // Applique le formatage au type interne et ajoute '[]'
    return `${formatType(type.slice(0, -2))}[]`;
  }

  if (type.match(/^[A-Za-z][A-Za-z0-9_]*$/)) {
    return type;
  }

  return "any";
}

/**
 * Gère les cas spéciaux (comme le rôle utilisateur) avant l'application du formatage.
 * * @param {object} field - L'objet champ avec { name, type }
 * @returns {string} Le type final formaté.
 */
function getFormattedType(field) {
  // Cas spécial pour la propriété 'role'
  if (field.name === "role" && field.type.toLowerCase().startsWith("string")) {
    return "Role";
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

    if (process.env.NODE_ENV !== 'production') {
      this.logger.error(
        \`Exception on \${request.method} \${request.url}\`,
        JSON.stringify({ message, status, errorDetails, exception }),
      );
    }

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

    if (process.env.NODE_ENV !== 'production') {
      this.logger.error(
        \`Exception on \${request.method} \${request.url}\`,
        JSON.stringify({ message, status, errorDetails, exception }),
      );
    }

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

    if (process.env.NODE_ENV !== 'production') {
      this.logger.error(
        \`Exception on \${request.method} \${request.url}\`,
        JSON.stringify({ message, status, errorDetails, exception }),
      );
    }

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

    if (process.env.NODE_ENV !== 'production') {
      this.logger.error(
        \`Exception on \${request.method} \${request.url}\`,
        JSON.stringify({ message, status, errorDetails, exception }),
      );
    }

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

export async function getPackageManager(flags) {
  const managers = ["npm", "yarn", "pnpm"];

  // 1. Vérification du flag
  if (
    flags.packageManager &&
    managers.includes(flags.packageManager.toLowerCase())
  ) {
    return flags.packageManager.toLowerCase();
  }

  // 2. Mode interactif
  const answers = await actualInquirer.prompt([
    {
      type: "list",
      name: "packageManager",
      message: "Choose your package manager:",
      choices: managers,
      default: "npm",
    },
  ]);

  return answers.packageManager;
}

export function pluralize(name) {
  if (name.endsWith("y")) {
    return name.slice(0, -1) + "ies"; // Category -> Categories
  } else if (name.endsWith("s")) {
    return name; // Déjà un pluriel
  }
  return name + "s"; // User -> Users
}
