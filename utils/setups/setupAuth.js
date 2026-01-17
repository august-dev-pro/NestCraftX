const { logInfo } = require("../loggers/logInfo");
const { runCommand } = require("../shell");
const { createDirectory, createFile, updateFile } = require("../userInput");
const { logSuccess } = require("../loggers/logSuccess");
const { generateDto } = require("../utils");

async function setupAuth(inputs) {
  logInfo(
    "🚀 Déploiement de l'architecture Auth Ultime (Mappers, DTOs, Multi-ORM)..."
  );

  const { dbConfig, useSwagger, mode = "full" } = inputs;
  const isFull = mode === "full";

  // 1. INSTALLATION DES DÉPENDANCES
  await runCommand(
    `npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt uuid`,
    "Erreur install deps auth"
  );
  await runCommand(
    `npm install -D @types/passport-jwt @types/bcrypt @types/uuid`,
    "Erreur install dev-deps auth"
  );

  // 2. DÉFINITION DES CHEMINS (CLEAN ARCHITECTURE)
  const paths = {
    root: "src/auth",
    application: isFull ? "src/auth/application" : "src/auth/services",
    interfaces: isFull ? "src/auth/domain/interfaces" : "",
    services: isFull ? "src/auth/application/services" : "src/auth/services",
    appDtos: isFull ? "src/auth/application/dtos" : "src/auth/dtos",
    domain: isFull ? "src/auth/domain" : "src/auth/",
    entities: isFull ? "src/auth/domain/entities" : "src/auth/entities",
    infra: isFull ? "src/auth/infrastructure" : "src/auth",
    controllers: isFull
      ? "src/auth/presentation/controllers"
      : "src/auth/controllers",
    persistence: isFull
      ? "src/auth/infrastructure/persistence"
      : "src/auth/persistence",
    mappers: isFull ? "src/auth/infrastructure/mappers" : "src/auth/mappers",
    guards: isFull ? "src/auth/infrastructure/guards" : "src/auth/guards",
    strategies: isFull
      ? "src/auth/infrastructure/strategies"
      : "src/auth/strategies",
    decorators: "src/common/decorators",
    enums: isFull
      ? "import { Role } from 'src/user/domain/enums/role.enum';"
      : "import { Role } from 'src/common/enums/role.enum';",
  };

  for (const path of Object.values(paths)) {
    if (path.startsWith("src/") && !path.includes("common"))
      await createDirectory(path);
  }

  // --- 3. COUCHE DOMAINE (ENTITÉS & INTERFACES) ---

  await createFile({
    path: `${paths.entities}/session.entity.ts`,
    contente: `
export class Session {
  id: string;
  token: string;
  userId: string;
  expiresAt: Date;
  createdAt?: Date;
}`.trim(),
  });

  if (isFull) {
    await createFile({
      path: `${paths.interfaces}/session.repository.interface.ts`,
      contente: `
import { Session } from '${paths.entities}/session.entity';
import { CreateSessionPersistenceDto } from '${paths.appDtos}/create-session.dto';

export interface ISessionRepository {
  save(dto: CreateSessionPersistenceDto): Promise<Session>;
  findByToken(token: string): Promise<Session | null>;
  findById(id: string): Promise<Session | null>;
  deleteByToken(token: string): Promise<void>;
  deleteByUserId(userId: string): Promise<void>;
  deleteById(sessionId: string): Promise<void>;
}`.trim(),
    });
  }

  // --- GÉNÉRATION DU SCHÉMA SESSION (Spécifique Mongoose) ---
  if (dbConfig.orm === "mongoose") {
    const sessionSchemaPath = isFull
      ? "src/auth/infrastructure/persistence/mongoose"
      : "src/auth/persistence";

    await createDirectory(sessionSchemaPath);

    await createFile({
      path: `${sessionSchemaPath}/session.schema.ts`,
      contente: `
import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type SessionDocument = Session & Document;

@Schema({ timestamps: true })
export class Session {
  @Prop({ required: true })
  refreshToken: string;

  @Prop({ required: true })
  userId: string;

  @Prop({ required: true })
  expiresAt: Date;
}

export const SessionSchema = SchemaFactory.createForClass(Session);
`.trim(),
    });
  }
  // --- 4. COUCHE APPLICATION (DTOS & SERVICES) ---

  await createFile({
    path: `${paths.appDtos}/create-session.dto.ts`,
    contente: `export class CreateSessionDto {
    refreshToken: string;
    userId: string;
    }

export interface CreateSessionPersistenceDto {
  userId: string;
  refreshToken: string;
  expiresAt: Date;
}`,
  });

  // Définition dynamique des types et injections
  const repoType = isFull ? "ISessionRepository" : "SessionRepository";
  const repoImport = isFull
    ? `import { ISessionRepository } from '${paths.interfaces}/session.repository.interface';`
    : `import { SessionRepository } from '${paths.persistence}/session.repository';`;
  const injectDecorator = isFull ? `@Inject('ISessionRepository') ` : "";

  await createFile({
    path: `${paths.services}/session.service.ts`,
    contente: `
import { Injectable${
      isFull ? ", Inject" : ""
    }, UnauthorizedException } from '@nestjs/common';
import { CreateSessionDto } from '${paths.appDtos}/create-session.dto';
${repoImport}

@Injectable()
export class SessionService {
  constructor(${injectDecorator}private readonly repo: ${repoType}) {}

  async create(data: CreateSessionDto) {
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + 7);

    return this.repo.save({
      ...data,
      expiresAt,
    });
  }

  /**
   * Safe validation (no exception)
   */
  async validate(token: string) {
    const session = await this.repo.findByToken(token);

    if (!session) return null;

    if (session.expiresAt && session.expiresAt < new Date()) {
      await this.repo.deleteById(session.id);
      return null;
    }

    return session;
  }

  /**
   * Boolean check (used by guards)
   */
  async isValidById(sessionId: string): Promise<boolean> {
    const session = await this.repo.findById(sessionId);

    if (!session) return false;

    if (session.expiresAt && session.expiresAt < new Date()) {
      await this.repo.deleteById(sessionId);
      return false;
    }

    return true;
  }

  /**
   * Hard revoke
   */
  async revoke(token: string): Promise<void> {
    const session = await this.repo.findByToken(token);

    if (!session || session.expiresAt < new Date()) {
      throw new UnauthorizedException('Invalid or expired session');
    }

    await this.repo.deleteById(session.id);
  }

  async revokeById(id: string): Promise<void> {
    await this.repo.deleteById(id);
  }
}
`.trim(),
  });

  // Auth Service
  let enumImport;
  let userDtoPath;
  let userRepoPath;
  let userRepoType;
  if (mode === "light") {
    userDtoPath = "src/user/dtos";
    userRepoPath = "src/user/repositories/user.repository";
    userRepoType = "UserRepository";
    enumImport = "import { Role } from 'src/common/enums/role.enum';";
  } else {
    userDtoPath = "src/user/application/dtos";
    userRepoPath = "src/user/domain/interfaces/user.repository.interface";
    userRepoType = "IUserRepository";
    enumImport = "import { Role } from 'src/user/domain/enums/role.enum';";
  }
  await createFile({
    path: `${paths.services}/auth.service.ts`,
    contente: `
import { Injectable, ConflictException, UnauthorizedException, Inject, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { SessionService } from './session.service';
import { LoginCredentialDto } from '${paths.appDtos}/loginCredential.dto';
import { RefreshTokenDto } from '${paths.appDtos}/refreshToken.dto';
import { SendOtpDto } from '${paths.appDtos}/sendOtp.dto';
import { VerifyOtpDto } from '${paths.appDtos}/verifyOtp.dto';
import { ForgotPasswordDto } from '${paths.appDtos}/forgotPassword.dto';
import { ResetPasswordDto } from '${paths.appDtos}/resetPassword.dto';
 ${
   mode === "light"
     ? `import { UserRepository } from '${userRepoPath}';
  import { CreateUserDto } from '${userDtoPath}/user.dto';`
     : `import { IUserRepository } from '${userRepoPath}';
  import { CreateUserDto } from '${userDtoPath}/user.dto';`
 }

@Injectable()
export class AuthService {
  private otps = new Map<string, string>();
  constructor(
    private readonly jwtService: JwtService,
    private readonly sessionService: SessionService,
  ${
    mode === "light"
      ? `private readonly userRepository: UserRepository,`
      : `@Inject('IUserRepository')
    private readonly userRepository: IUserRepository,`
  }
  ) {}

  // 🔒 Hash the user password
   async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
   }

   // 🧪 Compare a plain password with a hash
   async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
   }

   // 🧾 Registration (register)
   async register(dto: CreateUserDto): Promise<{ message: string }> {
    const existing = await this.userRepository.findByEmail(dto.email);
    if (existing) {
     throw new ConflictException('Email already in use');
    }

    const password = await this.hashPassword(dto.password);
    await this.userRepository.create({ ...dto, password });

    return { message: 'Registration successful' };
   }

  // 🔑 Login
  async login(dto: LoginCredentialDto) {
    const user = await this.userRepository.findByEmail(dto.email);
    if (!user || !(await bcrypt.compare(dto.password, user.getPassword()))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const refreshToken = this.jwtService.sign(
      { sub: user.getId() },
      { expiresIn: '7d' },
    );

    const session = await this.sessionService.create({
      userId: user.getId(),
      refreshToken: refreshToken,
    });

    const payload = {
      sub: user.getId(),
      email: user.getEmail(),
      sid: session.id,
      role: user.getRole(),
    };

    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });

    return {
      message: 'Login successful',
      accessToken,
      refreshToken,
    };
  }

  // 🔁 Refresh an access token
  async refreshToken(token: RefreshTokenDto) {
    const session = await this.sessionService.validate(token.refreshToken);
    if (!session) throw new UnauthorizedException('Session expired or invalid');
    const payload = this.jwtService.decode(token.refreshToken) as any;
    return { accessToken: this.jwtService.sign({ sub: payload.sub, email: payload.email }, { expiresIn: '15m' }) };
  }

  // 📲 Send OTP
   async sendOtp(dto: SendOtpDto) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otps.set(dto.email, otp);
    console.log(\`[OTP] for \${dto.email} is \${otp}\`);
    return { message: 'OTP sent' };
   }

   // Verify OTP
   async verifyOtp(dto: VerifyOtpDto) {
    const valid = this.otps.get(dto.email);
    if (valid === dto.otp) {
     this.otps.delete(dto.email);
     return { message: 'OTP verified' };
    }
    throw new UnauthorizedException('Invalid OTP');
   }

   // 📬 Forgot Password
   async forgotPassword(dto: ForgotPasswordDto) {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (!existingUser) throw new NotFoundException('User not found');

    const token = uuidv4();
    console.log(\`[ResetToken] for \${dto.email} is \${token}\`);
    return { message: 'Reset token sent' };
   }

   // 🔄 Reset Password
   async resetPassword(dto: ResetPasswordDto) {
    const existingUser = await this.userRepository.findByEmail(dto.email);
    if (!existingUser) throw new UnauthorizedException('Invalid reset token');

    const password = await this.hashPassword(dto.newPassword);
    await this.userRepository.update(existingUser.getId(), { password });

    return { message: 'Password reset successful' };
   }

  // 🔧 Generate token manually
   generateToken(payload: any) {
    return this.jwtService.sign(payload);
   }

  async logout(token: string) { await this.sessionService.revoke(token); return { success: true }; }
}`.trim(),
  });

  // --- 5. COUCHE INFRASTRUCTURE (PERSISTENCE & MAPPERS) ---

  // Génération du Mapper
  await createFile({
    path: `${paths.mappers}/session.mapper.ts`,
    contente: `
import { Session } from '${paths.entities}/session.entity';

export class SessionMapper {
  static toDomain(raw: any): Session {
    const session = new Session();
    session.id = raw.id || raw._id?.toString();
    session.token = raw.token;
    session.userId = raw.userId;
    session.expiresAt = raw.expiresAt;
    return session;
  }

  static toPersistence(domain: any) {
    return {
      token: domain.token,
      userId: domain.userId,
      expiresAt: domain.expiresAt,
    };
  }
}`.trim(),
  });

  // Implémentation des Repositories selon l'ORM

  // On prépare l'entête dynamiquement
  const interfaceImport = isFull
    ? `import { ISessionRepository } from '${paths.interfaces}/session.repository.interface';`
    : "";
  const implementsClause = isFull ? "implements ISessionRepository " : "";

  let repoContent = "";
  if (dbConfig.orm === "typeorm") {
    repoContent = `
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { SessionMapper } from '${paths.mappers}/session.mapper';
${interfaceImport}
import { Session as SessionEntity } from '${paths.entities}/session.entity';
import { CreateSessionPersistenceDto } from '${paths.appDtos}/create-session.dto';


@Injectable()
export class SessionRepository ${implementsClause} {
  constructor(@InjectRepository(SessionEntity) private readonly repo: Repository<SessionEntity>) {}

  async save(dto: CreateSessionPersistenceDto): Promise<SessionEntity> {
    const s = await this.repo.save(dto);
    return SessionMapper.toDomain(s);
  }

  async findByToken(token: string): Promise<SessionEntity | null> {
    const s = await this.repo.findOne({ where: { token: token } });
    return s ? SessionMapper.toDomain(s) : null;
  }

  async deleteByToken(token: string): Promise<void> {
    await this.repo.delete({ token: token });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.repo.delete({ userId });
  }

  async deleteById(id: string): Promise<void> {
    await this.repo.delete({ id });
  }

  async findById(id: string): Promise<SessionEntity | null> {
    const s = await this.repo.findOne({ where: { id } });
    return s ? SessionMapper.toDomain(s) : null;
  }
}
`;
  } else if (dbConfig.orm === "prisma") {
    repoContent = `
import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';
import { SessionMapper } from '${paths.mappers}/session.mapper';
${interfaceImport}
import { Session as SessionEntity } from '${paths.entities}/session.entity';
import { CreateSessionPersistenceDto } from '${paths.appDtos}/create-session.dto';


@Injectable()
export class SessionRepository ${implementsClause} {
  constructor(private readonly prisma: PrismaService) {}

  async save(data: CreateSessionPersistenceDto): Promise<SessionEntity> {
    const s = await this.prisma.session.create({ data });
    return SessionMapper.toDomain(s);
  }

  async findByToken(token: string): Promise<SessionEntity | null> {
    const s = await this.prisma.session.findFirst({ where: { refreshToken: token } });
    return s ? SessionMapper.toDomain(s) : null;
  }

  async deleteByToken(token: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { refreshToken: token } });
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.prisma.session.deleteMany({ where: { userId } });
  }

  async deleteById(id: string): Promise<void> {
    await this.prisma.session.delete({ where: { id } });
  }

  async findById(id: string): Promise<SessionEntity | null> {
    const s = await this.prisma.session.findUnique({ where: { id } });
    return s ? SessionMapper.toDomain(s) : null;
  }
}`;
  } else if (dbConfig.orm === "mongoose") {
    const sessionSchemaPath = isFull
      ? "src/auth/infrastructure/persistence/mongoose"
      : "src/auth/persistence";
    repoContent = `
import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { SessionMapper } from '${paths.mappers}/session.mapper';
${interfaceImport}
import { Session, SessionDocument } from '${sessionSchemaPath}/session.schema';
import { Session as SessionEntity } from '${paths.entities}/session.entity';
import { CreateSessionPersistenceDto } from '${paths.appDtos}/create-session.dto';


@Injectable()
export class SessionRepository ${implementsClause} {
  constructor(@InjectModel(Session.name) private readonly model: Model<SessionDocument>) {}

  async save(data: CreateSessionPersistenceDto): Promise<SessionEntity> {
    const s = await new this.model(data).save();
    return SessionMapper.toDomain(s);
  }

  async findByToken(token: string): Promise<SessionEntity | null> {
    const s = await this.model.findOne({ refreshToken: token }).exec();
    return s ? SessionMapper.toDomain(s) : null;
  }

  async deleteByToken(token: string): Promise<void> {
    await this.model.deleteOne({ refreshToken: token }).exec();
  }

  async deleteByUserId(userId: string): Promise<void> {
    await this.model.deleteMany({ userId: userId as any }).exec();
  }

  async findById(id: string): Promise<SessionEntity | null> {
    const s = await this.model.findById(id).exec();
    return s ? SessionMapper.toDomain(s) : null;
  }

  async deleteById(id: string): Promise<void> {
    await this.model.findByIdAndDelete(id).exec();
  }
}`;
  }

  await createFile({
    path: `${paths.persistence}/session.repository.ts`,
    contente: repoContent.trim(),
  });

  // --- 6. INFRASTRUCTURE WEB (CONTROLLER, GUARD, STRATEGY) ---

  await createFile({
    path: `${paths.controllers}/auth.controller.ts`,
    contente: `
import { Controller, Post, Body, Get, UseGuards } from '@nestjs/common';
import { AuthService } from '${paths.services}/auth.service';
import { LoginCredentialDto } from '${paths.appDtos}/loginCredential.dto';
import { RefreshTokenDto } from '${paths.appDtos}/refreshToken.dto';
import { JwtAuthGuard } from '${paths.guards}/jwt-auth.guard';
import { CurrentUser } from 'src/common/decorators/current-user.decorator';
import { CreateUserDto } from '${userDtoPath}/user.dto';
import { SendOtpDto } from '${paths.appDtos}/sendOtp.dto';
import { VerifyOtpDto } from '${paths.appDtos}/verifyOtp.dto';
import { ForgotPasswordDto } from '${paths.appDtos}/forgotPassword.dto';
import { ResetPasswordDto } from '${paths.appDtos}/resetPassword.dto';
${
  useSwagger
    ? "import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';"
    : ""
}

${useSwagger ? "@ApiTags('auth')" : ""}
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 📝 Create user account (👤)
  ${useSwagger ? "@ApiOperation({ summary: 'User register' })" : ""}
  @Post('register')
  register(@Body() body: CreateUserDto) {
    return this.authService.register(body);
  }

  // 🔐 User login (🔑)
  ${useSwagger ? "@ApiOperation({ summary: 'User login' })" : ""}
  @Post('login')
  login(@Body() dto: LoginCredentialDto) {
    return this.authService.login(dto);
  }

  ${useSwagger ? "@ApiOperation({ summary: 'Refresh access token' })" : ""}
  @Post('refresh')
  refreshToken(@Body() dto: RefreshTokenDto) {
    return this.authService.refreshToken(dto);
  }

  // 📤 Send OTP to email (📧)
  ${useSwagger ? "@ApiOperation({ summary: 'Send OTP to email' })" : ""}
  @Post('send-otp')
  sendOtp(@Body() dto: SendOtpDto) {
    return this.authService.sendOtp(dto);
  }

  // Verify sent OTP (✔️)
  ${useSwagger ? "@ApiOperation({ summary: 'Verify OTP code' })" : ""}
  @Post('verify-otp')
  verifyOtp(@Body() dto: VerifyOtpDto) {
    return this.authService.verifyOtp(dto);
  }

  // 🔁 Forgot password (📨)
  ${useSwagger ? "@ApiOperation({ summary: 'Request password reset' })" : ""}
  @Post('forgot-password')
  forgotPassword(@Body() dto: ForgotPasswordDto) {
    return this.authService.forgotPassword(dto);
  }

  // 🔄 Reset password (🔓)
  ${useSwagger ? "@ApiOperation({ summary: 'Reset user password' })" : ""}
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.authService.resetPassword(dto);
  }

  ${useSwagger ? "@ApiBearerAuth()" : ""}
  ${useSwagger ? "@ApiOperation({ summary: 'Logout user' })" : ""}
  @UseGuards(JwtAuthGuard)
  @Post('logout')
  logout(@Body() dto: RefreshTokenDto) {
    return this.authService.logout(dto.refreshToken);
  }

  // 👤 Get connected user profile (🧑‍💼)
  ${useSwagger ? "@ApiBearerAuth()" : ""}
  ${useSwagger ? "@ApiOperation({ summary: 'Get current user profile' })" : ""}
  @UseGuards(JwtAuthGuard)
  @Get('me')
  getMe(@CurrentUser() user: any) {
    return user;
  }
}`.trim(),
  });

  await createFile({
    path: `${paths.strategies}/jwt.strategy.ts`,
    contente: `
import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(config: ConfigService) {
    const jwtSecret = config.get<string>('JWT_SECRET');
    if (!jwtSecret) {
      throw new Error('JWT_SECRET is not defined in configuration');
    }
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

   async validate(payload: any) {
    return {
      userId: payload.sub,
      email: payload.email,
      sid: payload.sid,
      role: payload.role,
    };
  }

  }`.trim(),
  });

  await createFile({
    path: `${paths.guards}/jwt-auth.guard.ts`,
    contente: `
import { Injectable, ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Reflector } from '@nestjs/core';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';
import { SessionService } from '${paths.services}/session.service';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(
    private reflector: Reflector,
    private sessionService: SessionService,
  ) {
    super();
  }

 async canActivate(context: ExecutionContext) {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(), context.getClass(),
    ]);
    if (isPublic) return true;

    const canActivate = await super.canActivate(context);
    if (!canActivate) return false;

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user || !user.sid) {
      throw new UnauthorizedException('Invalid token payload');
    }

    const isSessionValid = await this.sessionService.isValidById(user.sid);
    if (!isSessionValid) {
      throw new UnauthorizedException('Session has been revoked');
    }

    return true;
  }
}`.trim(),
  });

  // role Guard
  await createFile({
    path: `${paths.guards}/role.guard.ts`,
    contente: `import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  ${paths.enums}
  import { ROLES_KEY } from 'src/common/decorators/role.decorator';
  import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';

  @Injectable()
  export class RolesGuard implements CanActivate {
   constructor(private reflector: Reflector) {}

   canActivate(context: ExecutionContext): boolean {
    // Check if the route is public
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
     context.getHandler(),
     context.getClass(),
    ]);

    if (isPublic) {
     return true; // Allow access without authentication
    }

    // Retrieve required roles for route access
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
     context.getHandler(),
     context.getClass(),
    ]);

    if (!requiredRoles) {
     return true; // If no roles are required, access is authorized
    }

    // Retrieve user from request.user (added by JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('🔍 Required Roles:', requiredRoles);
    console.log('👤 User Role:', user?.role);

    // Check if the user has one of the required roles
    return user && user.role && requiredRoles.includes(user.role);
   }
  }
  `,
  });

  // --- 7. CABLAGE FINAL DU MODULE ---
  let dbImports = "";
  let dbProviders = "";
  if (dbConfig.orm === "typeorm") {
    dbImports =
      "import { TypeOrmModule } from '@nestjs/typeorm';\nimport { Session as SessionEntity } from 'src/entities/Session.entity';";
    dbProviders = "TypeOrmModule.forFeature([SessionEntity]),";
  } else if (dbConfig.orm === "mongoose") {
    const schemaRelativePath = isFull
      ? "./infrastructure/persistence/mongoose/session.schema"
      : "./persistence/session.schema";

    dbImports = `import { MongooseModule } from '@nestjs/mongoose';
import { Session, SessionSchema } from '${schemaRelativePath}';`;

    dbProviders = `MongooseModule.forFeature([{ name: Session.name, schema: SessionSchema }]),`;
  } else if (dbConfig.orm === "prisma") {
    dbImports = "import { PrismaModule } from 'src/prisma/prisma.module';";
    dbProviders = "PrismaModule,";
  }

  await createFile({
    path: `${paths.root}/auth.module.ts`,
    contente: `
import { Module, forwardRef } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { UserModule } from '../user/user.module';
${dbImports}
import { AuthService } from '${paths.services}/auth.service';
import { SessionService } from '${paths.services}/session.service';
import { AuthController } from '${paths.controllers}/auth.controller';
import { JwtStrategy } from '${paths.strategies}/jwt.strategy';
import { SessionRepository } from '${paths.persistence}/session.repository';

@Module({
  imports: [
    ${dbProviders}
    forwardRef(() => UserModule),
    PassportModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (config: ConfigService) => ({
        secret: config.get('JWT_SECRET'),
        signOptions: { expiresIn: '15m' },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [
    AuthService,
    SessionService,
    JwtStrategy,
    ${
      isFull
        ? "{ provide: 'ISessionRepository', useClass: SessionRepository }"
        : "SessionRepository"
    }

  ],
  exports: [AuthService, SessionService],
})
export class AuthModule {}`.trim(),
  });

  // auth DTOs in user entity
  const dtos = [
    {
      name: "loginCredential",
      fields: [
        { name: "email", type: "string", swaggerExample: "user@example.com" },
        {
          name: "password",
          type: "string",
          swaggerExample: "StrongPassword123!",
        },
      ],
    },
    {
      name: "refreshToken",
      fields: [
        {
          name: "refreshToken",
          type: "string",
          swaggerExample: "eyJhbGciOiJIUzI1NiIsInR5cCI6...",
        },
      ],
    },
    {
      name: "sendOtp",
      fields: [
        { name: "email", type: "string", swaggerExample: "user@example.com" },
      ],
    },
    {
      name: "verifyOtp",
      fields: [
        { name: "email", type: "string", swaggerExample: "user@example.com" },
        { name: "otp", type: "string", swaggerExample: "123456" },
      ],
    },
    {
      name: "forgotPassword",
      fields: [
        { name: "email", type: "string", swaggerExample: "user@example.com" },
      ],
    },
    {
      name: "resetPassword",
      fields: [
        { name: "email", type: "string", swaggerExample: "user@example.com" },
        {
          name: "newPassword",
          type: "string",
          swaggerExample: "NewStrongPass123!",
        },
      ],
    },
  ];

  // Generation of each DTO
  for (const dto of dtos) {
    const DtoFileContent = await generateDto(dto, useSwagger, true, mode);
    await createFile({
      path: `${paths.appDtos}/${dto.name}.dto.ts`,
      contente: DtoFileContent,
    });
  }

  // Modification of AppModule
  const appModulePath = "src/app.module.ts";
  const addAuthModuleInterface = `UserModule,`;
  const replaceWithAuthModule = `UserModule,
   AuthModule,`;
  await updateFile({
    path: appModulePath,
    pattern: addAuthModuleInterface,
    replacement: replaceWithAuthModule,
  });

  const guardsImportPattern = `import { Module } from '@nestjs/common';`;
  const guardsImportReplacer = `import { Module } from '@nestjs/common';
  // 🛡️ Uncomment the lines below if you want to enable global guards
  // import { APP_GUARD } from '@nestjs/core';
  // import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
  // import { RolesGuard } from 'src/auth/guards/role.guard';
  import { AuthModule } from 'src/auth/auth.module';`;

  const addNestModuleInterface = `providers: [`;
  const replaceWithNestModule = `providers: [
    // 🛡️ Uncomment these lines to apply guards to all routes automatically
    /*
    {
     provide: APP_GUARD,
     useClass: JwtAuthGuard, // 🛡️ Global AuthGuard
    },
    {
     provide: APP_GUARD,
     useClass: RolesGuard, // 🛡️ Global RoleGuard
    },
    */
  `;

  await updateFile({
    path: appModulePath,
    pattern: guardsImportPattern,
    replacement: guardsImportReplacer,
  });

  await updateFile({
    path: appModulePath,
    pattern: addNestModuleInterface,
    replacement: replaceWithNestModule,
  });

  logSuccess(
    ` Authentification Enterprise avec support ${dbConfig.orm.toUpperCase()} et Mappers terminée !`
  );
}

module.exports = { setupAuth };
