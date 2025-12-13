const fs = require("fs");
const { logInfo } = require("../loggers/logInfo");
const { runCommand } = require("../shell");
const { createDirectory, createFile, updateFile } = require("../userInput");
const { logSuccess } = require("../loggers/logSuccess");
const { generateDto } = require("../utils");

async function setupAuth(inputs) {
  logInfo("Adding authentication with JWT and Passport...");

  const dbConfig = inputs.dbConfig;
  const useSwagger = inputs.useSwagger;
  const mode = inputs.mode || "full";

  await runCommand(
    `npm install @nestjs/jwt @nestjs/passport passport passport-jwt bcrypt uuid`,
    "Failed to install authentication dependencies"
  );
  await runCommand(
    `npm install -D @types/passport-jwt @types/bcrypt @types/uuid`,
    "Failed to install dev dependencies"
  );

  const authPaths = {
    authPath: "src/auth",
    authServicesPath: "src/auth/services",
    authControllersPath: "src/auth/controllers",
    authStrategyPath: "src/auth/strategy",
    authGuardsPath: "src/auth/guards",
    authDecoratorPath: "src/auth/decorator",
  };
  const authPath = "src/auth"; // Create directories
  await Object.values(authPaths).forEach(async (path) => {
    await createDirectory(path);
  });

  let ormImports = "";
  let ormModuleImport = "";
  let prismaProvider = ""; // To add PrismaService only if needed
  let userModulePath =
    mode === "light" ? "src/user/user.module" : "src/user/user.module";
  let userSchemaPath =
    mode === "light"
      ? "src/user/entities/user.schema"
      : "src/user/domain/entities/user.schema";

  if (dbConfig.orm === "typeorm") {
    ormImports = `import { TypeOrmModule } from '@nestjs/typeorm';
  import { User } from 'src/entities/User.entity';`;
    ormModuleImport = `TypeOrmModule.forFeature([User]),`;
  } else if (dbConfig.orm === "mongoose") {
    ormImports = `import { MongooseModule } from '@nestjs/mongoose';
  import { User, UserSchema } from '${userSchemaPath}';`;
    ormModuleImport = `MongooseModule.forFeature([{ name: User.name, schema: UserSchema }]),`;
    prismaProvider = ""; // Do not add PrismaService
  } else if (dbConfig.orm === "prisma") {
    ormImports = "";
    ormModuleImport = "";
    prismaProvider = "PrismaService,";
  }

  const userModuleImport =
    mode === "light" ? "src/user/user.module" : "src/user/user.module";

  await createFile({
    path: `${authPath}/auth.module.ts`,
    contente: `
  import { Module } from '@nestjs/common';
  import { JwtModule, JwtService } from '@nestjs/jwt';
  import { PassportModule } from '@nestjs/passport';
  ${ormImports}
  import { AuthService } from '${authPaths.authServicesPath}/auth.service';
  ${
    dbConfig.orm === "prisma"
      ? "import { PrismaService } from 'src/prisma/prisma.service';"
      : ""
  }
  import { AuthController } from '${
    authPaths.authControllersPath
  }/auth.controller';
  import { UserModule } from '${userModuleImport}';
  import { JwtStrategy } from '${authPaths.authStrategyPath}/jwt.strategy';
  import { AuthGuard } from '${authPaths.authGuardsPath}/auth.guard';

  @Module({
    imports: [
      UserModule,
      ${ormModuleImport}
      PassportModule,
      JwtModule.register({ secret: 'your-secret-key', signOptions: { expiresIn: '1h' } }),
    ],
    controllers: [AuthController],
    providers: [
      ${prismaProvider}
      AuthService,
      JwtStrategy,
      AuthGuard,
      JwtService
    ],
    exports: [AuthService],
  })
  export class AuthModule {}
  `.trim(),
  }); // 📌 Auth Service

  let enumImport;
  let userDtoPath;
  let authDtoPath;
  let userRepoPath;
  let userRepoType;
  if (mode === "light") {
    userDtoPath = "src/user/dto";
    authDtoPath = "src/user/dto";
    userRepoPath = "src/user/repositories/user.repository";
    userRepoType = "UserRepository";
    enumImport = "import { Role } from 'src/common/enums/role.enum';";
  } else {
    userDtoPath = "src/user/application/dtos";
    authDtoPath = "src/user/application/dtos";
    userRepoPath = "src/user/application/interfaces/user.repository.interface";
    userRepoType = "IUserRepository";
    enumImport = "import { Role } from 'src/user/domain/enums/role.enum';";
  }

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

  ${
    mode === "light"
      ? `import { UserRepository } from '${userRepoPath}';
  import { CreateUserDto } from '${userDtoPath}/user.dto';`
      : `import { IUserRepository } from '${userRepoPath}';
  import { CreateUserDto } from '${userDtoPath}/user.dto';`
  }
  import { LoginCredentialDto } from '${authDtoPath}/loginCredential.dto';
  import { RefreshTokenDto } from '${authDtoPath}/refreshToken.dto';
  import { SendOtpDto } from '${authDtoPath}/sendOtp.dto';
  import { VerifyOtpDto } from '${authDtoPath}/verifyOtp.dto';
  import { ForgotPasswordDto } from '${authDtoPath}/forgotPassword.dto';
  import { ResetPasswordDto } from '${authDtoPath}/resetPassword.dto';

  @Injectable()
  export class AuthService {
    private refreshTokens = new Map<string, string>();
    private otps = new Map<string, string>();

    constructor(
      private readonly jwtService: JwtService,
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
      const existing = await this.userRepository.findAll();
      if (existing.find((user) => user.getEmail() === dto.email)) {
        throw new ConflictException('Email already in use');
      }

      const password = await this.hashPassword(dto.password);
      await this.userRepository.create({ ...dto, password });

      return { message: 'Registration successful' };
    }

    // 🔑 Login
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

    // 🔁 Refresh an access token
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

    // 🚪 Logout
    async logout(dto: RefreshTokenDto) {
      const payload = this.jwtService.verify(dto.refreshToken);
      this.refreshTokens.delete(payload.sub);
      return { message: 'Logged out successfully' };
    }

    // 📲 Send OTP
    async sendOtp(dto: SendOtpDto) {
      const otp = Math.floor(100000 + Math.random() * 900000).toString();
      this.otps.set(dto.email, otp);
      console.log(\`[OTP] for \${dto.email} is \${otp}\`);
      return { message: 'OTP sent' };
    }

    // ✅ Verify OTP
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
      const users = await this.userRepository.findAll();
      const user = users.find((u) => u.getEmail() === dto.email);
      if (!user) throw new NotFoundException('User not found');

      const token = uuidv4();
      console.log(\`[ResetToken] for \${dto.email} is \${token}\`);
      return { message: 'Reset token sent' };
    }

    // 🔄 Reset Password
    async resetPassword(dto: ResetPasswordDto) {
      const users = await this.userRepository.findAll();
      const user = users.find((u) => u.getEmail() === dto.email);
      if (!user) throw new UnauthorizedException('Invalid reset token');

      const password = await this.hashPassword(dto.newPassword);
      await this.userRepository.update(user.getId(), { password });

      return { message: 'Password reset successful' };
    }

      // 👤 Get Profile
    async getProfile(user: any) {
      const found = await this.userRepository.findById(user.userId);
      if (!found) throw new NotFoundException('User not found');
      const email = found.getEmail();
      return { email: email };
    }

    // 🔧 Generate token manually
    generateToken(payload: any) {
      return this.jwtService.sign(payload);
    }
  }
  `,
  }); // 📌 Auth Controller
  await createFile({
    path: `${authPaths.authControllersPath}/auth.controller.ts`,
    contente: `import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
  import { Request } from 'express';
  import { AuthService } from "${authPaths.authServicesPath}/auth.service";
  import { JwtAuthGuard } from "${authPaths.authGuardsPath}/jwt-auth.guard";
  import { CreateUserDto } from '${userDtoPath}/user.dto';
  import { LoginCredentialDto } from '${authDtoPath}/loginCredential.dto';
  import { RefreshTokenDto } from '${authDtoPath}/refreshToken.dto';
  import { SendOtpDto } from '${authDtoPath}/sendOtp.dto';
  import { VerifyOtpDto } from '${authDtoPath}/verifyOtp.dto';
  import { ForgotPasswordDto } from '${authDtoPath}/forgotPassword.dto';
  import { ResetPasswordDto } from '${authDtoPath}/resetPassword.dto';
  ${useSwagger ? "import { ApiBearerAuth } from '@nestjs/swagger';" : ""}

  @Controller('auth')
  export class AuthController {
    constructor(private readonly authService: AuthService) {}

    // 📝 Create user account (👤)
    @Post('register')
    async register(@Body() body: CreateUserDto) {
      return this.authService.register(body);
    }

    // 🔐 User login (🔑)
    @Post('login')
    async login(@Body() body: LoginCredentialDto) {
      return this.authService.login(body);
    }

    // ♻️ Refresh access token (🔁)
    @Post('refresh')
    async refreshToken(@Body() body: RefreshTokenDto) {
      return this.authService.refreshToken(body);
    }

    // 🚪 User logout (🚫)
    @Post('logout')
    async logout(@Body() body: RefreshTokenDto) {
      return this.authService.logout(body);
    }

    // 📤 Send OTP to email (📧)
    @Post('send-otp')
    async sendOtp(@Body() body: SendOtpDto) {
      return this.authService.sendOtp(body);
    }

    // ✅ Verify sent OTP (✔️)
    @Post('verify-otp')
    async verifyOtp(@Body() body: VerifyOtpDto) {
      return this.authService.verifyOtp(body);
    }

    // 🔁 Forgot password (📨)
    @Post('forgot-password')
    async forgotPassword(@Body() body: ForgotPasswordDto) {
      return this.authService.forgotPassword(body);
    }

    // 🔄 Reset password (🔓)
    @Post('reset-password')
    async resetPassword(@Body() body: ResetPasswordDto) {
      return this.authService.resetPassword(body);
    }

    // 👤 Get connected user profile (🧑‍💼)
    ${useSwagger ? "@ApiBearerAuth()" : ""}
    @UseGuards(JwtAuthGuard)
    @Get('me')
    async getProfile(@Req() req: Request) {
      if (req.user) return this.authService.getProfile(req.user);
    }
  }

  `,
  }); // 📌 JWT Strategy

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
            };        }
        }`,
  }); // 📌 Auth Guard

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
  }); // 📌 role Guard

  await createFile({
    path: `${authPaths.authGuardsPath}/role.guard.ts`,
    contente: `import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
  import { Reflector } from '@nestjs/core';
  ${enumImport}
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
  }); // 📌 jwt Auth Guard

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
    console.log('Token found in Authorization header:', token);
  } else {
    console.log('No token found in Authorization header');
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
  }); // 📌 auth DTOs in user entity

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
  ]; // ✅ Generation of each DTO

  const dtosPath =
    mode === "light" ? "src/user/dto" : "src/user/application/dtos";
  for (const dto of dtos) {
    const DtoFileContent = await generateDto(dto, useSwagger, true, mode); // you must adapt your generateDto function to receive a dto with `name` and `fields`
    await createFile({
      path: `${dtosPath}/${dto.name}.dto.ts`,
      contente: DtoFileContent,
    });
  } // Modification of AppModule

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

  logSuccess("Authentication successfully configured ✅");
}
module.exports = { setupAuth };
