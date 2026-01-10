const { logInfo } = require("../loggers/logInfo");
const { logSuccess } = require("../loggers/logSuccess");
const { logError } = require("../loggers/logError");
const {
  createDirectory,
  createFile,
  updateFile,
  safeUpdateAppModule,
} = require("../userInput");
const {
  generateEntityFileContent,
  generateDto,
  generateMiddlewares,
  generateMongooseSchemaFileContent,
} = require("../utils");

async function setupLightArchitecture(inputs) {
  logInfo("Generating Light structure (MVP)");
  const mode = "light";

  const entitiesData = inputs.entitiesData;
  const dbConfig = inputs.dbConfig;
  const useSwagger = inputs.useSwagger;
  const useAuth = inputs.useAuth;

  const srcPath = "src";

  try {
    // Créer le dossier common/enums pour les énums
    await createDirectory("src/common/enums");

    // Générer l'enum Role si l'entité User existe
    const hasUserEntity = entitiesData.entities.some(
      (entity) => entity.name.toLowerCase() === "user"
    );

    if (hasUserEntity) {
      await createFile({
        path: "src/common/enums/role.enum.ts",
        contente: `export enum Role {
  USER = 'USER',
  ADMIN = 'ADMIN',
  SUPER_ADMIN = 'SUPER_ADMIN',
}
`,
      });
    }

    await updateFile({
      path: "src/app.module.ts",
      pattern: "import { Module } from '@nestjs/common';",
      replacement: `import { Module } from '@nestjs/common';\nimport { ConfigModule } from '@nestjs/config';`,
    });

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
      const entityPath = `${srcPath}/${entityNameLower}`;

      if (entityNameLower == "session") continue;

      await createDirectory(`${entityPath}/entities`);
      await createDirectory(`${entityPath}/dtos`);
      await createDirectory(`${entityPath}/services`);
      await createDirectory(`${entityPath}/repositories`);
      await createDirectory(`${entityPath}/controllers`);

      if (dbConfig.orm === "mongoose") {
        const mongooseSchemaContent = await generateMongooseSchemaFileContent(
          entity
        );
        await createFile({
          path: `${entityPath}/entities/${entityNameLower}.schema.ts`,
          contente: mongooseSchemaContent,
        });
      }

      const entityContent = await generateEntityFileContent(entity, mode);
      await createFile({
        path: `${entityPath}/entities/${entityNameLower}.entity.ts`,
        contente: entityContent,
      });

      const dtoContent = await generateDto(entity, useSwagger, false, mode);
      await createFile({
        path: `${entityPath}/dtos/${entityNameLower}.dto.ts`,
        contente: dtoContent,
      });

      const repositoryContent = generateLightRepository(
        entityNameCapitalized,
        entityNameLower,
        dbConfig.orm,
        entity
      );
      await createFile({
        path: `${entityPath}/repositories/${entityNameLower}.repository.ts`,
        contente: repositoryContent,
      });

      const serviceContent = generateLightService(
        entityNameCapitalized,
        entityNameLower
      );
      await createFile({
        path: `${entityPath}/services/${entityNameLower}.service.ts`,
        contente: serviceContent,
      });

      const controllerContent = generateLightController(
        entityNameCapitalized,
        entityNameLower,
        useSwagger
      );
      await createFile({
        path: `${entityPath}/controllers/${entityNameLower}.controller.ts`,
        contente: controllerContent,
      });

      const moduleContent = generateLightModule(
        entityNameCapitalized,
        entityNameLower,
        entityPath,
        dbConfig.orm,
        useAuth
      );
      await createFile({
        path: `${entityPath}/${entityNameLower}.module.ts`,
        contente: moduleContent,
      });

      await safeUpdateAppModule(entityNameLower);
    }

    await generateMiddlewares(dbConfig.orm);

    const appModulePath = "src/app.module.ts";
    await updateFile({
      path: appModulePath,
      pattern: `import { Module } from '@nestjs/common';`,
      replacement: `import { Module } from '@nestjs/common';
import { ResponseInterceptor } from './common/interceptors/response.interceptor';
import { APP_INTERCEPTOR } from '@nestjs/core';`,
    });

    await updateFile({
      path: appModulePath,
      pattern: `providers: \\[`,
      replacement: `providers: [
  {
    provide: APP_INTERCEPTOR,
    useClass: ResponseInterceptor,
  },`,
    });

    logSuccess(`Light structure successfully generated!`);
  } catch (error) {
    logError(`Error during light generation: ${error}`);
    throw error;
  }
}

function generateLightRepository(entityName, entityLower, orm, entity) {
  // Générateur de méthode spécifique (ex: findByEmail pour Auth)
  const isUser = entityLower === "user";
  const getExtraMethods = (ormType) => {
    if (!isUser) return "";

    switch (ormType) {
      case "typeorm":
        return `
async findByEmail(email: string): Promise<${entityName}Entity | null> {
  const result = await this.repository.findOne({ where: { email } as any });
  return result ? this.toEntity(result) : null;
}`;
      case "prisma":
        return `
async findByEmail(email: string): Promise<${entityName}Entity | null> {
  const result = await this.prisma.${entityLower}.findUnique({ where: { email } });
  return result ? this.toEntity(result) : null;
}`;
      case "mongoose":
        return `
async findByEmail(email: string): Promise<${entityName}Entity | null> {
  const result = await this.model.findOne({ email }).exec();
  return result ? this.toEntity(result) : null;
}`;
      case "sequelize":
        return `
async findByEmail(email: string): Promise<${entityName}Entity | null> {
  const record = await this.model.findOne({ where: { email } });
  return record ? this.mapper.toDomain(record) : null;
}`;
      default:
        return `
async findByEmail(email: string): Promise<${entityName}Entity | null> {
  throw new Error('Repository not implemented');
}`;
    }
  };

  // 1. Liste des types à NE PAS inclure dans le constructeur (les relations)
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

  // 2. On filtre pour ne garder que les champs simples
  const scalarFields = entity.fields.filter((f) => {
    const cleanType = f.type.toLowerCase().replace("[]", "");

    // On garde le champ seulement si c'est un type simple
    // et que ce n'est pas une relation (les types qui commencent par une Majuscule et ne sont pas dans SCALAR_TYPES)
    return SCALAR_TYPES.includes(cleanType);
  });

  const extraMethods = getExtraMethods(orm);

  if (orm === "prisma") {
    const fieldParams = scalarFields.map((f) => `raw.${f.name}`).join(", ");

    return `import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { Create${entityName}Dto, Update${entityName}Dto } from '../dtos/${entityLower}.dto';
import { ${entityName}Entity } from '../entities/${entityLower}.entity';

@Injectable()
export class ${entityName}Repository {
  private readonly logger = new Logger(${entityName}Repository.name);

  constructor(private readonly prisma: PrismaService) {}

  private toEntity(raw: any): ${entityName}Entity {
    return new ${entityName}Entity(
      raw.id,
      raw.createdAt,
      raw.updatedAt,
      ${fieldParams}
    );
  }

  async create(data: Create${entityName}Dto): Promise<${entityName}Entity> {
    const result = await this.prisma.${entityLower}.create({ data });
    return this.toEntity(result);
  }

  async findById(id: string): Promise<${entityName}Entity | null> {
    const result = await this.prisma.${entityLower}.findUnique({ where: { id } });
    return result ? this.toEntity(result) : null;
  }

  ${extraMethods}

  async findAll(): Promise<${entityName}Entity[]> {
    const results = await this.prisma.${entityLower}.findMany();
    return results.map(r => this.toEntity(r));
  }

  async update(id: string, data: Update${entityName}Dto): Promise<${entityName}Entity | null> {
    const result = await this.prisma.${entityLower}.update({ where: { id }, data });
    return this.toEntity(result);
  }

  async delete(id: string): Promise<void> {
    await this.prisma.${entityLower}.delete({ where: { id } });
  }
}`;
  }

  if (orm === "typeorm") {
    const fieldParams = scalarFields.map((f) => `raw.${f.name}`).join(", ");

    return `import { Injectable, Logger } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { ${entityName} } from 'src/entities/${entityName}.entity';
import { Create${entityName}Dto, Update${entityName}Dto } from '../dtos/${entityLower}.dto';
import { ${entityName}Entity } from '../entities/${entityLower}.entity';

@Injectable()
export class ${entityName}Repository {
  private readonly logger = new Logger(${entityName}Repository.name);

  constructor(
    @InjectRepository(${entityName})
    private readonly repository: Repository<${entityName}>
  ) {}

  private toEntity(raw: any): ${entityName}Entity {
    return new ${entityName}Entity(
      raw.id,
      raw.createdAt,
      raw.updatedAt,
      ${fieldParams}
    );
  }

  async create(data: Create${entityName}Dto): Promise<${entityName}Entity> {
    const result = await this.repository.save(data);
    return this.toEntity(result);
  }

  async findById(id: string): Promise<${entityName}Entity | null> {
    const result = await this.repository.findOne({ where: { id } });
    return result ? this.toEntity(result) : null;
  }

  ${extraMethods}

  async findAll(): Promise<${entityName}Entity[]> {
    const results = await this.repository.find();
    return results.map(r => this.toEntity(r));
  }

  async update(id: string, data: Update${entityName}Dto): Promise<${entityName}Entity | null> {
    await this.repository.update(id, data);
    const result = await this.repository.findOne({ where: { id } });
    return result ? this.toEntity(result) : null;
  }

  async delete(id: string): Promise<void> {
    await this.repository.delete(id);
  }
}`;
  }

  if (orm === "mongoose") {
    const fieldParams = scalarFields.map((f) => `obj.${f.name}`).join(", ");

    return `import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { ${entityName} } from '../entities/${entityLower}.schema';
import { Create${entityName}Dto, Update${entityName}Dto } from '../dtos/${entityLower}.dto';
import { ${entityName}Entity } from '../entities/${entityLower}.entity';

@Injectable()
export class ${entityName}Repository {
  private readonly logger = new Logger(${entityName}Repository.name);

  constructor(
    @InjectModel(${entityName}.name)
    private readonly model: Model<${entityName}>
  ) {}

  private toEntity(raw: any): ${entityName}Entity {
    const obj = raw.toObject ? raw.toObject() : raw;
    return new ${entityName}Entity(
      obj._id.toString(),
      obj.createdAt,
      obj.updatedAt,
      ${fieldParams}
    );
  }

  async create(data: Create${entityName}Dto): Promise<${entityName}Entity> {
    const result = await this.model.create(data);
    return this.toEntity(result);
  }

  async findById(id: string): Promise<${entityName}Entity | null> {
    const result = await this.model.findById(id);
    return result ? this.toEntity(result) : null;
  }

  ${extraMethods}

  async findByEmail(email: string): Promise<${entityName}Entity | null> {
  const result = await this.model.findOne({ email }).exec();
  return result ? this.toEntity(result) : null;
  }

  async findAll(): Promise<${entityName}Entity[]> {
    const results = await this.model.find();
    return results.map(r => this.toEntity(r));
  }

  async update(id: string, data: Update${entityName}Dto): Promise<${entityName}Entity | null> {
    const result = await this.model.findByIdAndUpdate(id, data, { new: true });
    return result ? this.toEntity(result) : null;
  }

  async delete(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id);
  }
}`;
  }

  return `import { Injectable, Logger } from '@nestjs/common';
import { Create${entityName}Dto, Update${entityName}Dto } from '../dtos/${entityLower}.dto';
import { ${entityName}Entity } from '../entities/${entityLower}.entity';

@Injectable()
export class ${entityName}Repository {
  private readonly logger = new Logger(${entityName}Repository.name);

  async create(data: Create${entityName}Dto): Promise<${entityName}Entity> {
    throw new Error('Repository not implemented');
  }

  async findById(id: string): Promise<${entityName}Entity | null> {
    throw new Error('Repository not implemented');
  }

  ${extraMethods}

  async findAll(): Promise<${entityName}Entity[]> {
    throw new Error('Repository not implemented');
  }

  async update(id: string, data: Update${entityName}Dto): Promise<${entityName}Entity | null> {
    throw new Error('Repository not implemented');
  }

  async delete(id: string): Promise<void> {
    throw new Error('Repository not implemented');
  }
}`;
}

function generateLightService(entityName, entityLower) {
  return `import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { ${entityName}Repository } from '../repositories/${entityLower}.repository';
import { Create${entityName}Dto, Update${entityName}Dto } from '../dtos/${entityLower}.dto';
import { ${entityName}Entity } from '../entities/${entityLower}.entity';

@Injectable()
export class ${entityName}Service {
  private readonly logger = new Logger(${entityName}Service.name);

  constructor(private readonly repository: ${entityName}Repository) {}

  async create(dto: Create${entityName}Dto): Promise<${entityName}Entity> {
    this.logger.log('Creating new ${entityLower}');
    return await this.repository.create(dto);
  }

  async findById(id: string): Promise<${entityName}Entity> {
    const entity = await this.repository.findById(id);
    if (!entity) {
      throw new NotFoundException(\`${entityName} with id \${id} not found\`);
    }
    return entity;
  }

  async findAll(): Promise<${entityName}Entity[]> {
    return await this.repository.findAll();
  }

  async update(id: string, dto: Update${entityName}Dto): Promise<${entityName}Entity> {
    await this.findById(id);
    const updated = await this.repository.update(id, dto);
    if (!updated) {
      throw new NotFoundException(\`Failed to update ${entityName}\`);
    }
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.findById(id);
    await this.repository.delete(id);
  }
}`;
}

function generateLightController(entityName, entityLower, useSwagger) {
  const swaggerImports = useSwagger
    ? `import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';\n`
    : "";
  const swaggerDecorators = useSwagger ? `@ApiTags('${entityLower}')\n` : "";

  return `import { Controller, Get, Post, Put, Delete, Body, Param, Logger } from '@nestjs/common';
${swaggerImports}import { ${entityName}Service } from '../services/${entityLower}.service';
import { Create${entityName}Dto, Update${entityName}Dto } from '../dtos/${entityLower}.dto';

${swaggerDecorators}@Controller('${entityLower}')
export class ${entityName}Controller {
  private readonly logger = new Logger(${entityName}Controller.name);

  constructor(private readonly service: ${entityName}Service) {}
${
  useSwagger
    ? `
  @ApiOperation({ summary: 'Create a new ${entityLower}' })
  @ApiResponse({ status: 201, description: 'Created' })`
    : ""
}
  @Post()
  async create(@Body() dto: Create${entityName}Dto) {
    return await this.service.create(dto);
  }
${
  useSwagger
    ? `
  @ApiOperation({ summary: 'Get all ${entityLower}s' })
  @ApiResponse({ status: 200, description: 'Success' })`
    : ""
}
  @Get()
  async findAll() {
    return await this.service.findAll();
  }
${
  useSwagger
    ? `
  @ApiOperation({ summary: 'Get ${entityLower} by id' })
  @ApiResponse({ status: 200, description: 'Success' })`
    : ""
}
  @Get(':id')
  async findById(@Param('id') id: string) {
    return await this.service.findById(id);
  }
${
  useSwagger
    ? `
  @ApiOperation({ summary: 'Update ${entityLower}' })
  @ApiResponse({ status: 200, description: 'Updated' })`
    : ""
}
  @Put(':id')
  async update(@Param('id') id: string, @Body() dto: Update${entityName}Dto) {
    return await this.service.update(id, dto);
  }
${
  useSwagger
    ? `
  @ApiOperation({ summary: 'Delete ${entityLower}' })
  @ApiResponse({ status: 200, description: 'Deleted' })`
    : ""
}
  @Delete(':id')
  async delete(@Param('id') id: string) {
    await this.service.delete(id);
    return { message: '${entityName} deleted successfully' };
  }
}`;
}

function generateLightController(entityName, entityLower, useSwagger) {
  // Swagger imports (optional)
  const swaggerImports = useSwagger
    ? `import { ApiTags, ApiOperation, ApiResponse, ApiCreatedResponse } from '@nestjs/swagger';\n`
    : "";

  // Swagger class decorator (optional)
  const swaggerClassDecorator = useSwagger
    ? `@ApiTags('${entityLower}')\n`
    : "";

  // Swagger method decorator helper
  const swaggerMethodDecorator = (summary) =>
    useSwagger ? `@ApiOperation({ summary: '${summary}' })\n  ` : "";

  return `import { Controller, Get, Post, Put, Delete, Body, Param, Logger } from '@nestjs/common';
${swaggerImports}import { ${entityName}Service } from '../services/${entityLower}.service';
import { Create${entityName}Dto, Update${entityName}Dto } from '../dtos/${entityLower}.dto';

${swaggerClassDecorator}@Controller('${entityLower}')
export class ${entityName}Controller {
  private readonly logger = new Logger(${entityName}Controller.name);

  constructor(private readonly service: ${entityName}Service) {}

  /**
   * Create a new ${entityLower}
   */
  @Post()
  ${swaggerMethodDecorator(`Create a new ${entityLower}`)}${
    useSwagger
      ? `@ApiCreatedResponse({ description: '${entityName} created successfully' })\n  `
      : ""
  }async create(@Body() dto: Create${entityName}Dto) {
    await this.service.create(dto);
    return { message: '${entityName} created successfully' };
  }

  /**
   * Get all ${entityLower}s
   */
  @Get()
  ${swaggerMethodDecorator(`Get all ${entityLower}s`)}${
    useSwagger
      ? `@ApiResponse({ status: 200, description: 'Success' })\n  `
      : ""
  }async findAll() {
    return await this.service.findAll();
  }

  /**
   * Get a ${entityLower} by id
   */
  @Get(':id')
  ${swaggerMethodDecorator(`Get ${entityLower} by id`)}${
    useSwagger
      ? `@ApiResponse({ status: 200, description: 'Success' })\n  `
      : ""
  }async findById(@Param('id') id: string) {
    return await this.service.findById(id);
  }

  /**
   * Update a ${entityLower}
   */
  @Put(':id')
  ${swaggerMethodDecorator(`Update ${entityLower}`)}${
    useSwagger
      ? `@ApiResponse({ status: 200, description: 'Updated' })\n  `
      : ""
  }async update(
    @Param('id') id: string,
    @Body() dto: Update${entityName}Dto,
  ) {
    await this.service.update(id, dto);
    return { message: '${entityName} updated successfully' };
  }

  /**
   * Delete a ${entityLower}
   */
  @Delete(':id')
  ${swaggerMethodDecorator(`Delete ${entityLower}`)}${
    useSwagger
      ? `@ApiResponse({ status: 200, description: 'Deleted' })\n  `
      : ""
  }async delete(@Param('id') id: string) {
    await this.service.delete(id);
    return { message: '${entityName} deleted successfully' };
  }
}`;
}

function generateLightModule(
  entityName,
  entityLower,
  entityPath,
  orm,
  useAuth = false
) {
  let importsBlock = [];
  let providersBlock = [`${entityName}Service`, `${entityName}Repository`];
  let extraImports = "";
  let forwardRefImport = "";

  if (orm === "prisma") {
    extraImports = `import { PrismaModule } from 'src/prisma/prisma.module';`;
    importsBlock.push("PrismaModule");
  } else if (orm === "typeorm") {
    extraImports = `import { ${entityName} } from 'src/entities/${entityName}.entity';
import { TypeOrmModule } from '@nestjs/typeorm';`;
    importsBlock.push(`TypeOrmModule.forFeature([${entityName}])`);
  } else if (orm === "mongoose") {
    extraImports = `import { MongooseModule } from '@nestjs/mongoose';
import { ${entityName}, ${entityName}Schema } from '${entityPath}/entities/${entityLower}.schema';`;
    importsBlock.push(
      `MongooseModule.forFeature([{ name: ${entityName}.name, schema: ${entityName}Schema }])`
    );
  }

  if (entityLower == "user" && useAuth) {
    extraImports += "\nimport { AuthModule } from 'src/auth/auth.module';";
    importsBlock.push("forwardRef(() => AuthModule)");
    forwardRefImport = " forwardRef,";
  }

  return `import {${forwardRefImport} Module } from '@nestjs/common';
${extraImports}
import { ${entityName}Controller } from '${entityPath}/controllers/${entityLower}.controller';
import { ${entityName}Service } from '${entityPath}/services/${entityLower}.service';
import { ${entityName}Repository } from '${entityPath}/repositories/${entityLower}.repository';

@Module({
  imports: [${importsBlock.join(", ")}],
  controllers: [${entityName}Controller],
  providers: [${providersBlock.join(", ")}],
  exports: [${entityName}Service, ${entityName}Repository]
})
export class ${entityName}Module {}`;
}

function capitalize(str) {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

function decapitalize(str) {
  return str.charAt(0).toLowerCase() + str.slice(1);
}

module.exports = { setupLightArchitecture };
