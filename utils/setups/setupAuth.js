const fs = require("fs");
const { logInfo } = require("../loggers/logInfo");
const { runCommand } = require("../shell");
const { createDirectory, createFile, updateFile } = require("../userInput");
const { logSuccess } = require("../loggers/logSuccess");

async function setupAuth() {
  logInfo("Ajout de l'authentification avec JWT et Passport...");
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

  // 📌 Auth Module
  await createFile({
    path: `${authPath}/auth.module.ts`,
    contente: `import { Module } from '@nestjs/common';
      import { JwtModule } from '@nestjs/jwt';
      import { PassportModule } from '@nestjs/passport';
      import { AuthService } from '${authPaths.authServicesPath}/auth.service';
      import { AuthController } from '${authPaths.authControllersPath}/auth.controller';
      import { JwtStrategy } from '${authPaths.authStrategyPath}/jwt.strategy';
      import { AuthGuard } from '${authPaths.authGuardsPath}/auth.guard';
      @Module({
        imports: [
          PassportModule,
          JwtModule.register({ secret: 'your-secret-key', signOptions: { expiresIn: '1h' } }),
        ],
        controllers: [AuthController],
        providers: [AuthService, JwtStrategy, AuthGuard],
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
import { CreateUserDto } from 'src/user/application/dtos/user.dto';
import { IUserRepository } from 'src/user/application/interfaces/user.repository.interface';
import { UserEntity } from 'src/user/domain/entities/user.entity';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class AuthService {
  private refreshTokens = new Map<string, string>();
  private otps = new Map<string, string>();

  constructor(
    private readonly jwtService: JwtService,
    @Inject('UserRepository') private readonly userRepository: IUserRepository,
  ) {}

  // ✅ Hash & verify
  async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async comparePassword(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }

  // 🧾 Register
  async register(dto: CreateUserDto): Promise<{ message: string }> {
    const existing = await this.userRepository.findAll();
    if (existing.find((user) => user.getEmail() === dto.email)) {
      throw new ConflictException('Email already in use');
    }

    const password = await this.hashPassword(dto.password);
    await this.userRepository.create({ ...dto, password });

    return { message: 'Registration successful' };
  }

  // 🔑 Login
  async login({ email, password }: { email: string; password: string }) {
    const users = await this.userRepository.findAll();
    const user = users.find((u) => u.getEmail() === email);
    if (!user || !(await this.comparePassword(password, user.getPassword()))) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const payload = { sub: user.getId(), email: user.getEmail() };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '15m' });
    const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });

    this.refreshTokens.set(user.getId(), refreshToken);

    return { accessToken, refreshToken };
  }

  // 🔁 Refresh token
  async refreshToken(refreshToken: string) {
    try {
      const payload = this.jwtService.verify(refreshToken);
      const stored = this.refreshTokens.get(payload.sub);
      if (stored !== refreshToken) throw new UnauthorizedException();

      const accessToken = this.jwtService.sign(
        { sub: payload.sub, email: payload.email },
        { expiresIn: '15m' },
      );
      return { accessToken };
    } catch {
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  // 🚪 Logout
  async logout(refreshToken: string) {
    const payload = this.jwtService.verify(refreshToken);
    this.refreshTokens.delete(payload.sub);
    return { message: 'Logged out successfully' };
  }

  // 📲 Send OTP
  async sendOtp(email: string) {
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    this.otps.set(email, otp);
    console.log(\`[OTP] for \${email} is \${otp}\`);
    return { message: 'OTP sent' };
  }

  // ✅ Verify OTP
  async verifyOtp(email: string, otp: string) {
    const valid = this.otps.get(email);
    if (valid === otp) {
      this.otps.delete(email);
      return { message: 'OTP verified' };
    }
    throw new UnauthorizedException('Invalid OTP');
  }

  // 🔐 Forgot password
  async forgotPassword(email: string) {
    const users = await this.userRepository.findAll();
    const user = users.find((u) => u.getEmail() === email);
    if (!user) throw new NotFoundException('User not found');

    const token = uuidv4();
    // await this.userRepository.update(user.getId(), {});
    console.log(\`[ResetToken] for ${email} is ${token}\`);

    return { message: 'Reset token sent' };
  }

  // 🔐 Reset password
  async resetPassword({
    email,
    newPassword,
  }: {
    email: string;
    newPassword: string;
  }) {
    const users = await this.userRepository.findAll();
    const user = users.find((u) => u.getEmail() === email);
    if (!user) throw new UnauthorizedException('Invalid reset token');

    const password = await this.hashPassword(newPassword);
    await this.userRepository.update(user.getId(), { password });

    return { message: 'Password reset successful' };
  }

  // 👤 Profile
  async getProfile(user: UserEntity) {
    const found = await this.userRepository.findById(user.getId());
    if (!found) throw new NotFoundException('User not found');
    return found;
  }

  // Token utils
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
import { AuthService } from '${authPaths.authServicesPath}/auth.service';
import { JwtAuthGuard } from '${authPaths.authGuardsPath}/jwt-auth.guard';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  async register(@Body() body: any) {
    return this.authService.register(body);
  }

  @Post('login')
  async login(@Body() body: any) {
    return this.authService.login(body);
  }

  @Post('refresh')
  async refreshToken(@Body() body: any) {
    return this.authService.refreshToken(body.refreshToken);
  }

  @Post('logout')
  async logout(@Body() body: any) {
    return this.authService.logout(body.refreshToken);
  }

  @Post('send-otp')
  async sendOtp(@Body() body: any) {
    return this.authService.sendOtp(body);
  }

  @Post('verify-otp')
  async verifyOtp(@Body() body: { email: string; otp: string }) {
    return this.authService.verifyOtp(body.email, body.otp);
  }

  @Post('forgot-password')
  async forgotPassword(@Body() body: any) {
    return this.authService.forgotPassword(body.email);
  }

  @Post('reset-password')
  async resetPassword(@Body() body: any) {
    return this.authService.resetPassword(body);
  }

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
          return { userId: payload.sub, username: payload.username };
        }
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
