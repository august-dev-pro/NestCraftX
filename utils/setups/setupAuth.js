const fs = require("fs");
const { logInfo } = require("../loggers/logInfo");
const { runCommand } = require("../shell");
const { createDirectory, createFile, updateFile } = require("../userInput");
const { logSuccess } = require("../loggers/logSuccess");
const { generateDto } = require("../utils");

async function setupAuth(inputs) {
  logInfo("Ajout de l'authentification avec JWT et Passport...");

  const dbConfig = inputs.dbConfig;
  const useSwagger = inputs.useSwagger;

  await runCommand(
    `npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt`,
    "Échec de l'installation des dépendances d'authentification"
  );
  await runCommand(
    `npm install -D @types/passport-jwt @types/bcrypt`,
    "Échec de l'installation des dépendances de dev"
  );

  const authPaths = {
    authPath: "src/auth",
    authServicesPath: "src/auth/services",
    authControllersPath: "src/auth/controllers",
    authStrategyPath: "src/auth/strategy",
    authGuardsPath: "src/auth/guards",
    authDecoratorPath: "src/auth/decorator",
  };
  const authPath = "src/auth";
  // creer les dossiers
  await Object.values(authPaths).forEach(async (path) => {
    await createDirectory(path);
  });

  const importsArray = [
    dbConfig.orm === "typeorm" ? `TypeOrmModule.forFeature([User])` : null,
    `PassportModule`,
    `JwtModule.register({ secret: 'your-secret-key', signOptions: { expiresIn: '1h' } })`,
  ]
    .filter(Boolean)
    .join(",\n          ");

  const typeormImports =
    dbConfig.orm === "typeorm"
      ? `import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/entities/User.entity';`
      : "";

  await createFile({
    path: `${authPath}/auth.module.ts`,
    contente: `import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { UserMapper } from 'src/user/domain/mappers/user.mapper';
${typeormImports}
import { AuthService } from '${authPaths.authServicesPath}/auth.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { AuthController } from '${authPaths.authControllersPath}/auth.controller';
import { JwtStrategy } from '${authPaths.authStrategyPath}/jwt.strategy';
import { AuthGuard } from '${authPaths.authGuardsPath}/auth.guard';
import { UserRepository } from 'src/user/infrastructure/repositories/user.repository';

@Module({
  imports: [
    ${importsArray}
  ],
  controllers: [AuthController],
  providers: [
    PrismaService,
    UserMapper,
    {
      provide: 'IUserRepository',
      useClass: UserRepository,
    },
    AuthService,
    JwtStrategy,
    AuthGuard
  ],
  exports: [AuthService],
})
export class AuthModule {}`,
  });

  // 📌 Auth Service
  await createFile({
    path: `${authPaths.authServicesPath}/auth.service.ts`,
    contente: `import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  ConflictException,
  Inject,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { v4 as uuidv4 } from 'uuid';

import { IUserRepository } from 'src/user/application/interfaces/user.repository.interface';
import { CreateUserDto } from 'src/user/application/dtos/user.dto';
import { LoginCredentialDto } from 'src/user/application/dtos/loginCredential.dto';
import { RefreshTokenDto } from 'src/user/application/dtos/refreshToken.dto';
import { SendOtpDto } from 'src/user/application/dtos/sendOtp.dto';
import { VerifyOtpDto } from 'src/user/application/dtos/verifyOtp.dto';
import { ForgotPasswordDto } from 'src/user/application/dtos/forgotPassword.dto';
import { ResetPasswordDto } from 'src/user/application/dtos/resetPassword.dto';

@Injectable()
export class AuthService {
  private refreshTokens = new Map<string, string>();
  private otps = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    @Inject('IUserRepository')
    private readonly userRepository: IUserRepository,
  ) {}

  // 🔒 Hasher le mot de passe utilisateur
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  // 🧪 Comparer un mot de passe en clair avec un hash
  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // 🧾 Inscription (register)
  async register(dto: CreateUserDto): Promise<{ message: string }> {
    const existing = await this.userRepository.findAll();
    if (existing.find((user) => user.getEmail() === dto.email)) {
      throw new ConflictException('Email already in use');
    }

    const password = await this.hashPassword(dto.password);
    await this.userRepository.create({ ...dto, password });

    return { message: 'Registration successful' };
  }

  // 🔑 Connexion (login)
  async login(dto: LoginCredentialDto) {
    const users = await this.userRepository.findAll();
    const user = users.find((u) => u.getEmail() === dto.email);
    if (!user || !(await this.comparePassword(dto.password, user.getPassword()))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.getId(), email: user.getEmail() };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    this.refreshTokens.set(user.getId(), refreshToken);

    return { accessToken, refreshToken };
  }

  // 🔁 Rafraîchir un token d'accès
  async refreshToken(dto: RefreshTokenDto) {
    try {
      const payload = this.jwtService.verify(dto.refreshToken);
      const stored = this.refreshTokens.get(payload.sub);
      if (stored !== dto.refreshToken) throw new UnauthorizedException();

      const accessToken = this.jwtService.sign(
        { sub: payload.sub, email: payload.email },
        { expiresIn: '15m' },
      );
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // 🚪 Déconnexion
  async logout(dto: RefreshTokenDto) {
    const payload = this.jwtService.verify(dto.refreshToken);
    this.refreshTokens.delete(payload.sub);
    return { message: 'Logged out successfully' };
  }

  // 📲 Envoyer un OTP
  async sendOtp(dto: SendOtpDto) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otps.set(dto.email, otp);
    console.log(\`[OTP] for \${dto.email} is \${otp}\`);
    return { message: 'OTP sent' };
  }

  // ✅ Vérifier un OTP
  async verifyOtp(dto: VerifyOtpDto) {
    const valid = this.otps.get(dto.email);
    if (valid === dto.otp) {
      this.otps.delete(dto.email);
      return { message: 'OTP verified' };
    }
    throw new UnauthorizedException('Invalid OTP');
  }

  // 📬 Mot de passe oublié
  async forgotPassword(dto: ForgotPasswordDto) {
    const users = await this.userRepository.findAll();
    const user = users.find((u) => u.getEmail() === dto.email);
    if (!user) throw new NotFoundException('User not found');

    const token = uuidv4();
    console.log(\`[ResetToken] for \${dto.email} is \${token}\`);
    return { message: 'Reset token sent' };
  }

  // 🔄 Réinitialiser le mot de passe
  async resetPassword(dto: ResetPasswordDto) {
    const users = await this.userRepository.findAll();
    const user = users.find((u) => u.getEmail() === dto.email);
    if (!user) throw new UnauthorizedException('Invalid reset token');

    const password = await this.hashPassword(dto.newPassword);
    await this.userRepository.update(user.getId(), { password });

    return { message: 'Password reset successful' };
  }

    // 👤 Obtenir le profil
  async getProfile(user: any) {
    const found = await this.userRepository.findById(user.userId);
    if (!found) throw new NotFoundException('User not found');
    const email = found.getEmail();
    return { email: email };
  }

  // 🔧 Générer un token manuellement
  generateToken(payload: any) {
    return this.jwtService.sign(payload);
  }
}
`,
  });
  // 📌 Auth Controller
  await createFile({
    path: `${authPaths.authControllersPath}/auth.controller.ts`,
    contente: `import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { Request } from 'express';
import { AuthService } from "${authPaths.authServicesPath}/auth.service";
import { JwtAuthGuard } from "${authPaths.authGuardsPath}/jwt-auth.guard";
import { CreateUserDto } from 'src/user/application/dtos/user.dto';
import { LoginCredentialDto } from 'src/user/application/dtos/loginCredential.dto';
import { RefreshTokenDto } from 'src/user/application/dtos/refreshToken.dto';
import { SendOtpDto } from 'src/user/application/dtos/sendOtp.dto';
import { VerifyOtpDto } from 'src/user/application/dtos/verifyOtp.dto';
import { ForgotPasswordDto } from 'src/user/application/dtos/forgotPassword.dto';
import { ResetPasswordDto } from 'src/user/application/dtos/resetPassword.dto';
${useSwagger ? "import { ApiBearerAuth } from '@nestjs/swagger';" : ""}

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  // 📝 Créer un compte utilisateur (👤)
  @Post('register')
  async register(@Body() body: CreateUserDto) {
    return this.authService.register(body);
  }

  // 🔐 Connexion utilisateur (🔑)
  @Post('login')
  async login(@Body() body: LoginCredentialDto) {
    return this.authService.login(body);
  }

  // ♻️ Rafraîchir le token d'accès (🔁)
  @Post('refresh')
  async refreshToken(@Body() body: RefreshTokenDto) {
    return this.authService.refreshToken(body);
  }

  // 🚪 Déconnexion utilisateur (🚫)
  @Post('logout')
  async logout(@Body() body: RefreshTokenDto) {
    return this.authService.logout(body);
  }

  // 📤 Envoyer un OTP au mail (📧)
  @Post('send-otp')
  async sendOtp(@Body() body: SendOtpDto) {
    return this.authService.sendOtp(body);
  }

  // ✅ Vérifier l'OTP envoyé (✔️)
  @Post('verify-otp')
  async verifyOtp(@Body() body: VerifyOtpDto) {
    return this.authService.verifyOtp(body);
  }

  // 🔁 Mot de passe oublié (📨)
  @Post('forgot-password')
  async forgotPassword(@Body() body: ForgotPasswordDto) {
    return this.authService.forgotPassword(body);
  }

  // 🔄 Réinitialiser le mot de passe (🔓)
  @Post('reset-password')
  async resetPassword(@Body() body: ResetPasswordDto) {
    return this.authService.resetPassword(body);
  }

  // 👤 Obtenir le profil utilisateur connecté (🧑‍💼)
  ${useSwagger ? "@ApiBearerAuth()" : ""}
  @UseGuards(JwtAuthGuard)
  @Get('me')
  async getProfile(@Req() req: Request) {
    if (req.user) return this.authService.getProfile(req.user);
  }
}

`,
  });

  // 📌 JWT Strategy
  await createFile({
    path: `${authPaths.authStrategyPath}/jwt.strategy.ts`,
    contente: `import { Injectable } from '@nestjs/common';
      import { PassportStrategy } from '@nestjs/passport';
      import { ExtractJwt, Strategy } from 'passport-jwt';
      @Injectable()
      export class JwtStrategy extends PassportStrategy(Strategy) {
        constructor() {
          super({
            jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
            ignoreExpiration: false,
            secretOrKey: 'your-secret-key',
          });
        }
        async validate(payload: any) {
          return {
            userId: payload.sub,
            email: payload.email,
          };        }
      }`,
  });

  // 📌 Auth Guard
  await createFile({
    path: `${authPaths.authGuardsPath}/auth.guard.ts`,
    contente: `import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
        import { Reflector } from '@nestjs/core';
        import { JwtService } from '@nestjs/jwt';
        @Injectable()
        export class AuthGuard implements CanActivate {
        constructor(private reflector: Reflector, private jwtService: JwtService) {}
        canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const authHeader = request.headers.authorization;
        if (!authHeader) return false;
        try {
          const token = authHeader.split(' ')[1];
          this.jwtService.verify(token);
          return true;
        } catch (e) {
          return false;
        }
      }
    }`,
  });

  // 📌 role Guard
  await createFile({
    path: `${authPaths.authGuardsPath}/role.guard.ts`,
    contente: `import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from 'src/user/domain/enums/role.enum';
import { ROLES_KEY } from 'src/common/decorators/role.decorator';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    // Vérifier si la route est publique
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true; // Laisser passer sans authentification
    }

    // Récupérer les rôles requis pour l'accès à la route
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles) {
      return true; // Si aucun rôle requis, accès autorisé
    }

    // Récupérer l'utilisateur depuis request.user (ajouté par JwtAuthGuard)
    const request = context.switchToHttp().getRequest();
    const user = request.user;

    console.log('🔍 Rôles requis:', requiredRoles);
    console.log('👤 Rôle utilisateur:', user?.role);

    // Vérifier si l'utilisateur a l'un des rôles requis
    return user && user.role && requiredRoles.includes(user.role);
  }
}
`,
  });

  // 📌 jwt Auth Guard
  await createFile({
    path: `${authPaths.authGuardsPath}/jwt-auth.guard.ts`,
    contente: `import { Injectable, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { Observable } from 'rxjs';
import { IS_PUBLIC_KEY } from 'src/common/decorators/public.decorator';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor(private reflector: Reflector) {
    super();
  }

  canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const req = context.switchToHttp().getRequest();
    const token = req.headers.authorization;

    /* if (token) {
  console.log('Token trouvé dans le header Authorization:', token);
} else {
  console.log('Aucun token trouvé dans le header Authorization');
} */


    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }
    return super.canActivate(context);
  }
}
`,
  });

  // 📌 auth DTOs in user entity
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

  // ✅ Génération de chaque DTO
  for (const dto of dtos) {
    const DtoFileContent = await generateDto(dto, useSwagger, true); // tu dois adapter ta fonction generateDto pour recevoir un dto avec `name` et `fields`
    await createFile({
      path: `src/user/application/dtos/${dto.name}.dto.ts`,
      contente: DtoFileContent,
    });
  }

  // modification de AppModule
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
// 🛡️ Décommentez les lignes ci-dessous si vous souhaitez activer les guards globalement
// import { APP_GUARD } from '@nestjs/core';
// import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
// import { RolesGuard } from 'src/auth/guards/role.guard';
import { AuthModule } from 'src/auth/auth.module';`;

  const addNestModuleInterface = `providers: [`;
  const replaceWithNestModule = `providers: [
    // 🛡️ Décommentez ces lignes pour appliquer les guards à toutes les routes automatiquement
    /*
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard, // 🛡️ AuthGuard global
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard, // 🛡️ RoleGuard global
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

  logSuccess("Authentification configurée avec succès ✅");
}
module.exports = { setupAuth };
