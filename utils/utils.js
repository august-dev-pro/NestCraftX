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

export async function generateDtox(
  entity,
  useSwagger,
  isAuthDto = false,
  mode = "full"
) {
  const entityName = capitalize(entity.name);
  const entityNameLower = entity.name.toLowerCase();

  /* ===============================
     ENUM IMPORT
  =============================== */
  let enumImport = "";
  if (entityName === "User") {
    enumImport =
      mode === "light"
        ? "\nimport { Role } from 'src/common/enums/role.enum';"
        : "\nimport { Role } from 'src/user/domain/enums/role.enum';";
  }

  /* ===============================
     SWAGGER HELPERS (PRO)
  =============================== */
  const getFieldDescription = (f) => {
    const name = f.name.toLowerCase();
    if (name.includes("email")) return "The official email address of the user";
    if (name.includes("password"))
      return "Must contain at least 8 characters, one letter and one number";
    if (name.includes("token")) return "Authentication token";
    if (name.includes("id") && name !== "id")
      return `Unique identifier of the related ${name.replace("id", "")}`;
    return `The ${f.name} of the ${entityNameLower}`;
  };

  const getExampleForField = (f) => {
    const fieldName = f.name.toLowerCase();
    const isArray = f.type.endsWith("[]");
    const cleanType = f.type.toLowerCase().replace("[]", "");

    const getBaseExample = () => {
      if (fieldName.includes("email")) return "user@example.com";
      if (fieldName.includes("password")) return "SecurePass@2024";
      if (fieldName.includes("token")) return "eyJhbGciOi...";
      if (fieldName.includes("id") && fieldName !== "id")
        return "550e8400-e29b-41d4-a716-446655440000";

      if (fieldName.includes("title") || fieldName.includes("name"))
        return `${capitalize(entityName)} Example`;
      if (fieldName.includes("content") || fieldName.includes("description"))
        return "This is a detailed example content.";
      if (
        fieldName.includes("url") ||
        fieldName.includes("image") ||
        fieldName.includes("avatar")
      )
        return "https://images.unsplash.com/photo-123456789";

      if (fieldName.includes("price") || fieldName.includes("amount"))
        return 99.99;
      if (fieldName.includes("quantity") || fieldName.includes("count"))
        return 10;
      if (fieldName.includes("status") || fieldName.includes("type"))
        return "active";
      if (fieldName.includes("date") || fieldName.includes("at"))
        return "2024-12-01T10:30:00Z";

      switch (cleanType) {
        case "string":
        case "text":
        case "uuid":
          return `${f.name.toLowerCase()}_val`;
        case "number":
        case "int":
        case "decimal":
          return 42;
        case "float":
          return 23.5;
        case "boolean":
          return true;
        case "json":
          return { metadata: "value", version: 1 }; // objet réel
        case "date":
          return new Date().toISOString();
        default:
          return `${f.name.toLowerCase()}_val`;
      }
    };

    const base = getBaseExample();
    return isArray ? [base, base] : base;
  };

  /* ===============================
     FIELD GENERATOR (PRO)
  =============================== */
  const generateFieldLine = (f, optional = false) => {
    if (entityName === "User" && f.name.toLowerCase() === "role") return null;

    const name = f.name;
    const type = f.type.toLowerCase();
    const isArray = type.endsWith("[]");
    const cleanType = type.replace("[]", "");

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
    if (!SCALAR_TYPES.includes(cleanType)) return null;

    let validators = [];
    if (optional) validators.push("@IsOptional()");

    if (name.toLowerCase().includes("email")) {
      validators.push("@IsEmail()");
    } else if (name.toLowerCase().includes("password")) {
      validators.push(
        "@MinLength(8, { message: 'Password is too short (min 8 characters)' })"
      );
    }

    switch (cleanType) {
      case "string":
      case "text":
        validators.push(isArray ? "@IsString({ each: true })" : "@IsString()");
        if (!isArray) validators.push("@MinLength(2)");
        break;
      case "number":
      case "float":
        validators.push(
          isArray ? "@IsNumber({}, { each: true })" : "@IsNumber()"
        );
        break;
      case "int":
        validators.push(isArray ? "@IsInt({ each: true })" : "@IsInt()");
        break;
      case "boolean":
        validators.push(
          isArray ? "@IsBoolean({ each: true })" : "@IsBoolean()"
        );
        break;
      case "uuid":
        validators.push("@IsUUID()");
        break;
      case "date":
        validators.push("@IsDateString()");
        break;
    }

    if (isArray) validators.push("@IsArray()");

    let swaggerDecorator = "";
    if (useSwagger) {
      const decorator = optional ? "@ApiPropertyOptional" : "@ApiProperty";

      const options = JSON.stringify(
        {
          example: getExampleForField(f),
          description: getFieldDescription(f),
        },
        null,
        2
      ).replace(/"([^"]+)":/g, "$1:");

      swaggerDecorator = `${decorator}(${options})\n  `;
    }

    return `${swaggerDecorator}${validators.join("\n  ")}\n  ${name}${
      optional ? "?" : ""
    }: ${formatType(f.type)};`;
  };

  /* ======================================================
      AUTH DTO → UN SEUL DTO
  ====================================================== */
  if (isAuthDto) {
    const authFields = entity.fields
      .map((f) => generateFieldLine(f, false))
      .filter(Boolean)
      .join("\n\n  ");

    return `import {
  IsString, IsInt, IsBoolean, IsEmail, IsArray,
  IsUUID, IsDateString, MinLength, IsOptional
} from 'class-validator';

/**
 * Auth DTO
 */
export class ${entityName}Dto {
  ${authFields}
}
`;
  }

  /* ======================================================
      CRUD DTOs (Create / Update)
  ====================================================== */
  const createFields = entity.fields
    .map((f) => generateFieldLine(f, false))
    .filter(Boolean)
    .join("\n\n  ");

  const updateFields = entity.fields
    .map((f) => generateFieldLine(f, true))
    .filter(Boolean)
    .join("\n\n  ");

  return `import {
  IsOptional, IsString, IsInt, IsBoolean, IsEmail,
  IsArray, IsUUID, IsDateString, MinLength, IsEnum
} from 'class-validator';
${
  useSwagger
    ? "import { ApiProperty, ApiPropertyOptional, PartialType } from '@nestjs/swagger';"
    : ""
}
${enumImport}
${useSwagger ? "" : "import { PartialType } from '@nestjs/mapped-types';"}

/**
 * DTO for creating a ${entityName}
 */
export class Create${entityName}Dto {
  ${createFields}

  ${
    entityName === "User"
      ? `
  ${useSwagger ? "@ApiHideProperty()\n " : ""}
  @IsOptional()
  @IsEnum(Role)
  role: Role = Role.USER;`
      : ""
  }
}

/**
 * DTO for updating a ${entityName}
 */
${
  useSwagger
    ? `export class Update${entityName}Dto extends PartialType(Create${entityName}Dto) {}`
    : `export class Update${entityName}Dto {
  ${updateFields}

  ${
    entityName === "User"
      ? `@IsEnum(Role)
  @IsOptional()
  role?: Role;`
      : ""
  }
}`
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
  const entityNameLower = entity.name.toLowerCase();

  /* ===============================
     ENUM IMPORT
  =============================== */
  let enumImport = "";
  if (entityName === "User") {
    enumImport =
      mode === "light"
        ? "\nimport { Role } from 'src/common/enums/role.enum';"
        : "\nimport { Role } from 'src/user/domain/enums/role.enum';";
  }

  /* ===============================
     SWAGGER HELPERS
  =============================== */
  const getFieldDescription = (f) => {
    const name = f.name.toLowerCase();
    if (name.includes("email")) return "The official email address of the user";
    if (name.includes("password"))
      return "Must contain at least 8 characters, one letter and one number";
    if (name.includes("token")) return "Authentication token";
    if (name.includes("id") && name !== "id")
      return `Unique identifier of the related ${name.replace("id", "")}`;
    return `The ${f.name} of the ${entityNameLower}`;
  };

  const getExampleForField = (f) => {
    const fieldName = f.name.toLowerCase();
    const isArray = f.type.endsWith("[]");
    const cleanType = f.type.toLowerCase().replace("[]", "");

    const getBaseExample = () => {
      if (fieldName.includes("email")) return "user@example.com";
      if (fieldName.includes("password")) return "SecurePass@2024";
      if (fieldName.includes("token")) return "eyJhbGciOi...";
      if (fieldName.includes("id") && fieldName !== "id")
        return "550e8400-e29b-41d4-a716-446655440000";
      if (fieldName.includes("title") || fieldName.includes("name"))
        return `${capitalize(entityName)} Example`;
      if (cleanType === "boolean") return true;
      if (cleanType === "number" || cleanType === "int") return 42;
      return `${f.name.toLowerCase()}_val`;
    };

    const base = getBaseExample();
    return isArray ? [base, base] : base;
  };

  /* ===============================
     FIELD GENERATOR
  =============================== */
  const generateFieldLine = (f, optional = false, forceNoSwagger = false) => {
    if (entityName === "User" && f.name.toLowerCase() === "role") return null;

    const name = f.name;
    const cleanType = f.type.toLowerCase().replace("[]", "");
    const isArray = f.type.endsWith("[]");

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
    ];
    if (!SCALAR_TYPES.includes(cleanType)) return null;

    let validators = [];
    if (optional) validators.push("@IsOptional()");
    if (name.toLowerCase().includes("email")) validators.push("@IsEmail()");
    else if (name.toLowerCase().includes("password"))
      validators.push(
        "@MinLength(8, { message: 'Password is too short (min 8 characters)' })"
      );

    switch (cleanType) {
      case "string":
      case "text":
        validators.push(isArray ? "@IsString({ each: true })" : "@IsString()");
        if (!isArray && !name.toLowerCase().includes("password"))
          validators.push("@MinLength(2)");
        break;
      case "number":
      case "int":
      case "float":
        validators.push(
          isArray ? "@IsNumber({}, { each: true })" : "@IsNumber()"
        );
        break;
      case "boolean":
        validators.push(
          isArray ? "@IsBoolean({ each: true })" : "@IsBoolean()"
        );
        break;
      case "uuid":
        validators.push("@IsUUID()");
        break;
      case "date":
        validators.push("@IsDateString()");
        break;
    }
    if (isArray) validators.push("@IsArray()");

    let swaggerDecorator = "";
    if (useSwagger && !forceNoSwagger) {
      const decorator = optional ? "@ApiPropertyOptional" : "@ApiProperty";
      const options = JSON.stringify(
        {
          example: getExampleForField(f),
          description: getFieldDescription(f),
        },
        null,
        2
      ).replace(/"([^"]+)":/g, "$1:");
      swaggerDecorator = `${decorator}(${options})\n  `;
    }

    return `${swaggerDecorator}${validators.join("\n  ")}\n  ${name}${
      optional ? "?" : ""
    }: ${formatType(f.type)};`;
  };

  /* ======================================================
      AUTH DTO (Strict & Clean)
  ====================================================== */
  if (isAuthDto) {
    const authFields = entity.fields
      .map((f) => generateFieldLine(f, false))
      .filter(Boolean)
      .join("\n\n  ");

    return `import {
  IsString, IsInt, IsBoolean, IsEmail, IsArray,
  IsUUID, IsDateString, MinLength, IsOptional
} from 'class-validator';
${useSwagger ? "import { ApiProperty } from '@nestjs/swagger';" : ""}

/**
 * Auth DTO - Strict contract for authentication
 */
export class ${entityName}Dto {
  ${authFields}
}
`;
  }

  /* ======================================================
      CRUD DTOs (Create / Update)
  ====================================================== */
  const createFields = entity.fields
    .map((f) => generateFieldLine(f, false))
    .filter(Boolean)
    .join("\n\n  ");

  const updateFields = entity.fields
    .map((f) => generateFieldLine(f, true))
    .filter(Boolean)
    .join("\n\n  ");

  // On prépare les imports Swagger dynamiquement
  let swaggerImports = ["ApiProperty", "ApiPropertyOptional", "PartialType"];
  if (entityName === "User") swaggerImports.push("ApiHideProperty");

  return `import {
  IsOptional, IsString, IsInt, IsBoolean, IsEmail,
  IsArray, IsUUID, IsDateString, MinLength, IsEnum
} from 'class-validator';
${
  useSwagger
    ? `import { ${swaggerImports.join(", ")} } from '@nestjs/swagger';`
    : ""
}
${enumImport}

/**
 * DTO for creating a ${entityName}
 */
export class Create${entityName}Dto {
  ${createFields}

  ${
    entityName === "User"
      ? `
  ${useSwagger ? "@ApiHideProperty()" : ""}
  @IsOptional()
  @IsEnum(Role)
  role: Role = Role.USER;`
      : ""
  }
}

/**
 * DTO for updating a ${entityName}
 */
${
  useSwagger
    ? `export class Update${entityName}Dto extends PartialType(Create${entityName}Dto) {}`
    : `export class Update${entityName}Dto {
  ${updateFields}

  ${
    entityName === "User"
      ? `@IsEnum(Role)
  @IsOptional()
  role?: Role;`
      : ""
  }
}`
}
`;
}

export async function generateController(entityName, entityPath, useSwagger) {
  const entityNameLower = decapitalize(entityName);
  const entityNameCapitalized = capitalize(entityName);
  const pluralName = pluralize(entityNameLower);

  const swaggerImports = useSwagger
    ? `import { ApiTags, ApiOperation, ApiResponse, ApiParam } from '@nestjs/swagger';`
    : "";

  const swaggerClassDecorator = useSwagger
    ? `@ApiTags('${capitalize(pluralName)}')` // Tags en Majuscule et au pluriel
    : "";

  return `
import { Controller, Get, Post, Body, Param, Patch, Delete, HttpCode, HttpStatus, Query } from '@nestjs/common';
${swaggerImports}
import { ${entityNameCapitalized}Service } from '${entityPath}/application/services/${entityNameLower}.service';
import { Create${entityNameCapitalized}Dto, Update${entityNameCapitalized}Dto } from 'src/${entityNameLower}/application/dtos/${entityNameLower}.dto';


/**
 * Controller for ${entityNameCapitalized} management.
 * Handles incoming HTTP requests and delegates logic to the service layer.
 */
${swaggerClassDecorator}
@Controller('${pluralName}')
export class ${entityNameCapitalized}Controller {
  constructor(private readonly service: ${entityNameCapitalized}Service) {}

  ${
    entityNameLower !== "user"
      ? `
  @Post()
  @HttpCode(HttpStatus.CREATED)
  ${
    useSwagger
      ? `
  @ApiOperation({ summary: 'Create a new ${entityNameLower}', description: 'Creates a new record for ${entityNameLower} in the database.' })
  @ApiResponse({ status: 201, description: 'The ${entityNameLower} has been successfully created.' })
  @ApiResponse({ status: 400, description: 'Invalid input data.' })`
      : ""
  }
  async create(@Body() dto: Create${entityNameCapitalized}Dto) {
    const result = await this.service.create(dto);
    return {
      message: '${entityNameCapitalized} created successfully',
      data: result
    };
  }
  `
      : ""
  }

  @Get()
  ${
    useSwagger
      ? `
  @ApiOperation({ summary: 'Get all ${pluralName}', description: 'Retrieves a list of all ${pluralName} available.' })
  @ApiResponse({ status: 200, description: 'Return all ${pluralName}.' })`
      : ""
  }
  async getAll() {
    return await this.service.getAll();
  }

  @Get(':id')
  ${
    useSwagger
      ? `
  @ApiOperation({ summary: 'Get ${entityNameLower} by ID' })
  @ApiParam({ name: 'id', description: 'The unique identifier of the ${entityNameLower}' })
  @ApiResponse({ status: 200, description: 'The ${entityNameLower} has been found.' })
  @ApiResponse({ status: 404, description: '${entityNameCapitalized} not found.' })`
      : ""
  }
  async getById(@Param('id') id: string) {
    return await this.service.getById(id);
  }

  @Patch(':id')
  ${
    useSwagger
      ? `
  @ApiOperation({ summary: 'Update an existing ${entityNameLower}' })
  @ApiParam({ name: 'id', description: 'The unique identifier of the ${entityNameLower} to update' })
  @ApiResponse({ status: 200, description: 'The ${entityNameLower} has been successfully updated.' })
  @ApiResponse({ status: 404, description: '${entityNameCapitalized} not found.' })`
      : ""
  }
  async update(
    @Param('id') id: string,
    @Body() dto: Update${entityNameCapitalized}Dto,
  ) {
    await this.service.update(id, dto);
    return { message: '${entityNameCapitalized} updated successfully' };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  ${
    useSwagger
      ? `
  @ApiOperation({ summary: 'Delete a ${entityNameLower}' })
  @ApiParam({ name: 'id', description: 'The unique identifier of the ${entityNameLower} to delete' })
  @ApiResponse({ status: 204, description: 'The ${entityNameLower} has been successfully deleted.' })
  @ApiResponse({ status: 404, description: '${entityNameCapitalized} not found.' })`
      : ""
  }
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
import { ${entityNameCapitalized}Entity } from '${entityPath}/domain/entities/${entityNameLower}.entity';
import { ${entityNameCapitalized} } from 'src/entities/${entityNameCapitalized}.entity';
import { I${entityNameCapitalized}Repository } from '${entityPath}/domain/interfaces/${entityNameLower}.repository.interface';
import { Create${entityNameCapitalized}Dto, Update${entityNameCapitalized}Dto } from '${entityPath}/application/dtos/${entityNameLower}.dto';
import { ${entityNameCapitalized}Mapper } from '${entityPath}/infrastructure/mappers/${entityNameLower}.mapper';

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
  async findById(id: string): Promise<${entityNameCapitalized}Entity | null> {
    const record = await this.repository.findOne({
      where: { id },
    });

    if (!record) return null;

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
import { Create${entityNameCapitalized}Dto, Update${entityNameCapitalized}Dto } from '${entityPath}/application/dtos/${entityNameLower}.dto';
import { I${entityNameCapitalized}Repository } from '${entityPath}/domain/interfaces/${entityNameLower}.repository.interface';
import { ${entityNameCapitalized}Entity } from '${entityPath}/domain/entities/${entityNameLower}.entity';
import { ${entityNameCapitalized}Mapper } from '${entityPath}/infrastructure/mappers/${entityNameLower}.mapper';

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
  async findById(id: string): Promise<${entityNameCapitalized}Entity | null> {
    const record = await this.prisma.${entityNameLower}.findUnique({
      where: { id },
    });

    if (!record) return null;

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
import { Create${entityNameCapitalized}Dto, Update${entityNameCapitalized}Dto } from '${entityPath}/application/dtos/${entityNameLower}.dto';
import { I${entityNameCapitalized}Repository } from '${entityPath}/domain/interfaces/${entityNameLower}.repository.interface';
import { ${entityNameCapitalized} } from '${entityPath}/infrastructure/persistence/mongoose/${entityNameLower}.schema';
import { ${entityNameCapitalized}Mapper } from '${entityPath}/infrastructure/mappers/${entityNameLower}.mapper';

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
  async findById(id: string): Promise<${entityNameCapitalized}Entity | null> {
    const record = await this.model.findById(id).exec();

    if (!record) return null;

    return this.mapper.toDomain(record);
  }

  ${extraMethods}

  // update
  async update(id: string, data: Update${entityNameCapitalized}Dto): Promise<${entityNameCapitalized}Entity> {
    const toUpdate = this.mapper.toUpdatePersistence(data);
    const updated = await this.model.findByIdAndUpdate(id, toUpdate, { new: true }).exec();
    return this.mapper.toDomain(updated);
  }

  // find all
  async findAll(): Promise<${entityNameCapitalized}Entity[]> {
    const records = await this.model.find().exec();
    return records.map(record => this.mapper.toDomain(record));
  }

  // delete
  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
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
import { Create${entityNameCapitalized}Dto, Update${entityNameCapitalized}Dto } from '${entityPath}/application/dtos/${entityNameLower}.dto';
import { I${entityNameCapitalized}Repository } from '${entityPath}/domain/interfaces/${entityNameLower}.repository.interface';
import { ${entityNameCapitalized}Entity } from '${entityPath}/domain/entities/${entityNameLower}.entity';
import { ${entityNameCapitalized}Mapper } from '${entityPath}/infrastructure/mappers/${entityNameLower}.mapper';

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
    const records = await this.model.find();
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

export async function generateMongooseSchemaFileContentx(
  entity,
  entitiesData,
  mode = "full"
) {
  const entityName = capitalize(entity.name);
  const entityNameLower = entity.name.toLowerCase();
  const isFull = mode === "full";

  let extraImports = "";

  // 1. GESTION DES IMPORTS DES RELATIONS (Inclus Session dans Auth)
  const relatedEntities = entitiesData.relations
    .filter((rel) => rel.from === entityNameLower || rel.to === entityNameLower)
    .map((rel) => (rel.from === entityNameLower ? rel.to : rel.from));

  // On retire les doublons et l'entité elle-même
  const uniqueRelated = [...new Set(relatedEntities)].filter(
    (e) => e !== entityNameLower
  );

  uniqueRelated.forEach((target) => {
    const targetCap = capitalize(target);
    // EXCEPTION : Si c'est session, le dossier est auth
    const moduleName = target === "session" ? "auth" : target;

    const importPath =
      mode === "full"
        ? `../../../../${moduleName}/infrastructure/persistence/mongoose/${target}.schema`
        : `../../${moduleName}/entities/${target}.schema`;

    extraImports += `import { ${targetCap} } from '${importPath}';\n`;
  });

  // GESTION DU ROLE (USER)
  if (entityNameLower === "user") {
    const rolePath = isFull
      ? "../../../domain/enums/role.enum"
      : "../../common/enums/role.enum";
    extraImports += `import { Role } from '${rolePath}';\n`;
  }

  // --- RESTE DE TON CODE (directFields & dynamicRelations) ---

  /*  const directFields = entity.fields.map((f) => {

    const fieldName = f.name;
    const fieldNameLow = fieldName.toLowerCase();

    if (entityNameLower === "user" && fieldName === "role") {
      return `  @Prop({ type: String, enum: Role, default: Role.USER })\n  role: Role;`;
    }

    if (fieldNameLow.endsWith("id")) {
      const targetEntity = fieldNameLow.replace("id", "");
      const hasRelation = entitiesData.relations.some(
        (r) => r.from === targetEntity || r.to === targetEntity
      );

      if (hasRelation) {
        const refModel = capitalize(targetEntity);
        return `  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: ${refModel}.name, required: true })\n  ${fieldName}: mongoose.Types.ObjectId;`;
      }
    }

    return `  @Prop({ required: true })\n  ${fieldName}: ${
      f.type.toLowerCase() === "date" ? "Date" : f.type.toLowerCase()
    };`;
  }); */

  const directFields = entity.fields
    .filter((f) => {
      // ❌ ignore les champs relationnels objets (post, user, etc.)
      if (isRelationObjectField(f, entitiesData)) return false;

      // ❌ ignore aussi les champs non scalaires
      const scalarTypes = [
        "string",
        "text",
        "number",
        "int",
        "float",
        "boolean",
        "date",
        "uuid",
        "json",
      ];

      return scalarTypes.includes(f.type.toLowerCase());
    })
    .map((f) => {
      const fieldName = f.name;
      const fieldNameLow = fieldName.toLowerCase();

      if (entityNameLower === "user" && fieldName === "role") {
        return `  @Prop({ type: String, enum: Role, default: Role.USER })\n  role: Role;`;
      }

      if (fieldNameLow.endsWith("id")) {
        const targetEntity = fieldNameLow.replace("id", "");
        const hasRelation = entitiesData.relations.some(
          (r) => r.from === targetEntity || r.to === targetEntity
        );

        if (hasRelation) {
          const refModel = capitalize(targetEntity);
          return `  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: ${refModel}.name, required: true })\n  ${fieldName}: mongoose.Types.ObjectId;`;
        }
      }

      return `  @Prop({ required: true })\n  ${fieldName}: ${
        f.type.toLowerCase() === "date" ? "Date" : f.type.toLowerCase()
      };`;
    });

  const dynamicRelations = entitiesData.relations
    .map((rel) => {
      const isFrom = rel.from === entityNameLower;
      const isTo = rel.to === entityNameLower;
      if (!isFrom && !isTo) return null;

      const otherEntity = isFrom ? rel.to : rel.from;
      const otherCap = capitalize(otherEntity);

      switch (rel.type) {
        // ==========================================
        // CASE 1-n
        // ==========================================
        case "1-n":
          if (isTo) {
            return `  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: ${otherCap}.name, required: true })\n  ${otherEntity}Id: mongoose.Types.ObjectId;`;
          }
          return null;

        // ==========================================
        // CASE n-1
        // ==========================================
        case "n-1":
          if (isFrom) {
            return `  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: ${otherCap}.name, required: true })\n  ${otherEntity}Id: mongoose.Types.ObjectId;`;
          }
          return null;

        // ==========================================
        // CASE 1-1
        // ==========================================
        case "1-1":
          if (isFrom) {
            return `  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: ${otherCap}.name, unique: true })\n  ${otherEntity}Id: mongoose.Types.ObjectId;`;
          }
          return null;

        // ==========================================
        // CASE n-n
        // ==========================================
        case "n-n":
          return `  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: ${otherCap}.name }] })\n  ${otherEntity}Ids: mongoose.Types.ObjectId[];`;

        default:
          return null;
      }
    })
    .filter(Boolean);

  const allFields = [...new Set([...directFields, ...dynamicRelations])].join(
    "\n\n"
  );

  return `
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Document } from 'mongoose';
${extraImports}

export type ${entityName}Document = ${entityName} & Document;

@Schema({ timestamps: true })
export class ${entityName} {
${allFields}
}

export const ${entityName}Schema = SchemaFactory.createForClass(${entityName});
`.trim();
}

export async function generateMongooseSchemaFileContent(
  entity,
  entitiesData,
  mode = "full"
) {
  const entityName = capitalize(entity.name);
  const entityNameLower = entity.name.toLowerCase();
  const isFull = mode === "full";

  // --- 1. IMPORTS DYNAMIQUES ---
  const relatedEntities = entitiesData.relations
    .filter((rel) => rel.from === entityNameLower || rel.to === entityNameLower)
    .map((rel) => (rel.from === entityNameLower ? rel.to : rel.from));

  const uniqueRelated = [...new Set(relatedEntities)].filter(
    (e) => e !== entityNameLower
  );

  let extraImports = "";
  /*  uniqueRelated.forEach((target) => {
    const targetCap = capitalize(target);
    const moduleName = target === "session" ? "auth" : target;
    const importPath = isFull
      ? `../../../../${moduleName}/infrastructure/persistence/mongoose/${target}.schema`
      : `../../${moduleName}/entities/${target}.schema`;

    extraImports += `import { ${targetCap} } from '${importPath}';\n`;
  }); */
  uniqueRelated.forEach((target) => {
    const targetCap = capitalize(target);
    const moduleName = target === "session" ? "auth" : target;

    let importPath = "";

    if (isFull) {
      // Mode Clean Architecture (Full)
      importPath = `../../../../${moduleName}/infrastructure/persistence/mongoose/${target}.schema`;
    } else {
      // Mode Light
      // Si pour Auth tu as fait une exception et mis le schéma dans un sous-dossier :
      if (target === "session") {
        importPath = `../../auth/persistence/${target}.schema`;
      } else {
        // Pour les autres entités en mode Light (ex: src/post/entities/post.schema.ts)
        importPath = `../../${moduleName}/entities/${target}.schema`;
      }
    }

    extraImports += `import { ${targetCap} } from '${importPath}';\n`;
  });

  if (entityNameLower === "user") {
    const rolePath = isFull
      ? "../../../domain/enums/role.enum"
      : "../../common/enums/role.enum";
    extraImports += `import { Role } from '${rolePath}';\n`;
  }

  // --- 2. LOGIQUE DES RELATIONS DYNAMIQUES (Prioritaire) ---
  const dynamicRelations = entitiesData.relations
    .map((rel) => {
      const isFrom = rel.from === entityNameLower;
      const isTo = rel.to === entityNameLower;
      if (!isFrom && !isTo) return null;

      const otherEntity = isFrom ? rel.to : rel.from;
      const otherCap = capitalize(otherEntity);

      switch (rel.type) {
        case "1-n":
          return isTo
            ? `  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: ${otherCap}.name, required: true })\n  ${otherEntity}Id: mongoose.Types.ObjectId;`
            : null;
        case "n-1":
          return isFrom
            ? `  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: ${otherCap}.name, required: true })\n  ${otherEntity}Id: mongoose.Types.ObjectId;`
            : null;
        case "1-1":
          return isFrom
            ? `  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: ${otherCap}.name, unique: true })\n  ${otherEntity}Id: mongoose.Types.ObjectId;`
            : null;
        case "n-n":
          return `  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: ${otherCap}.name }] })\n  ${otherEntity}Ids: mongoose.Types.ObjectId[];`;
        default:
          return null;
      }
    })
    .filter(Boolean);

  // --- 3. FILTRAGE DES CHAMPS DIRECTS (Scalaires uniquement) ---
  const scalarTypes = [
    "string",
    "text",
    "number",
    "int",
    "float",
    "boolean",
    "date",
    "uuid",
    "json",
  ];

  const directFields = entity.fields
    .filter((f) => {
      const nameLow = f.name.toLowerCase();
      // On dégage tout ce qui ressemble à une relation pour éviter les doublons avec dynamicRelations
      const isRelId = uniqueRelated.some(
        (rel) => nameLow === rel + "id" || nameLow === rel
      );
      return scalarTypes.includes(f.type.toLowerCase()) && !isRelId;
    })
    .map((f) => {
      const fieldName = f.name;
      const rawType = f.type.toLowerCase();

      // 1. Gestion spécifique du Role
      if (entityNameLower === "user" && fieldName === "role") {
        return `  @Prop({ type: String, enum: Role, default: Role.USER })\n  role: Role;`;
      }

      // 2. Mapping des types CLI -> TypeScript/Mongoose
      let tsType = "string"; // Valeur par défaut
      let propOptions = "required: true";

      switch (rawType) {
        case "text":
        case "uuid":
        case "string":
          tsType = "string";
          break;
        case "int":
        case "number":
        case "float":
        case "decimal":
          tsType = "number";
          break;
        case "boolean":
          tsType = "boolean";
          break;
        case "date":
          tsType = "Date";
          break;
        case "json":
          tsType = "Record<string, any>"; // Ou 'any'
          propOptions = "type: Object, required: true";
          break;
        default:
          tsType = "any";
      }

      return `  @Prop({ ${propOptions} })\n  ${fieldName}: ${tsType};`;
    });

  const allFields = [...new Set([...directFields, ...dynamicRelations])].join(
    "\n\n"
  );

  return `import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import * as mongoose from 'mongoose';
import { Document } from 'mongoose';
${extraImports}

export type ${entityName}Document = ${entityName} & Document;

@Schema({ timestamps: true })
export class ${entityName} {
${allFields}
}

export const ${entityName}Schema = SchemaFactory.createForClass(${entityName});`.trim();
}

function isRelationObjectField(field, entitiesData) {
  const typeLower = field.type.toLowerCase();

  return entitiesData.entities?.some((e) => e.name.toLowerCase() === typeLower);
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
