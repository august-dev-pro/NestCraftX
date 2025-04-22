const fs = require("fs");
const { execSync } = require("child_process");
const { logInfo } = require("../loggers/logInfo");
const { logSuccess } = require("../loggers/logSuccess");

async function setupSwagger(inputs) {
  logInfo("Installation et Configuration de Swagger...");

  // installation de swagger
  try {
    execSync("npm install @nestjs/swagger swagger-ui-express", {
      stdio: "inherit",
    });
  } catch (error) {
    console.error("❌ Échec de l'installation de Swagger :", error);
    process.exit(1);
  }

  // Modification de main.ts pour intégrer Swagger
  const mainTsPath = "src/main.ts";
  let mainTs = fs.readFileSync(mainTsPath, "utf8");

  if (!mainTs.includes("DocumentBuilder")) {
    // Ajout des imports Swagger et Logger si nécessaires
    mainTs = mainTs.replace(
      "import { NestFactory",
      "import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';\nimport { ConfigService } from '@nestjs/config';\nimport { Logger } from '@nestjs/common';\nimport { NestFactory"
    );

    // retirer
    // Configuration de Swagger directement dans bootstrap
    mainTs = mainTs.replace(
      "const app = await NestFactory.create(AppModule);",
      ""
    );

    // Configuration de Swagger directement dans bootstrap
    mainTs = mainTs.replace(
      "async function bootstrap() {",
      `async function bootstrap() {
    const app = await NestFactory.create(AppModule);

    // Configuration Swagger
    const config = new DocumentBuilder()
      .setTitle('${inputs.title}')
      .setDescription('${inputs.description}')
      .setVersion('${inputs.version}')
      .addBearerAuth(
        { type: 'http', scheme: 'bearer', bearerFormat: 'JWT', in: 'header' },
        'access-token'
      )
      .build();

    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('${inputs.endpoint}', app, document);

    const configService = app.get(ConfigService);
    const port = configService.get<number>('PORT', 3000);
    const host = configService.get<string>('HOST', '0.0.0.0');
`
    );

    // Ajout du bloc try/catch pour le démarrage de l'application
    if (mainTs.includes("await app.listen")) {
      mainTs = mainTs.replace(
        "await app.listen(process.env.PORT ?? 3000);",
        `try {
    await app.listen(port, host);

    const logger = new Logger('Bootstrap');
    logger.log(\`🚀 Application running on: \${await app.getUrl()}/${inputs.endpoint}\`);
    logger.log(\`🌐 Environment: \${process.env.NODE_ENV || 'development'}\`);
    logger.log(\`📡 Listening on \${host}:\${port}\`);
  } catch (error) {
    const logger = new Logger('Bootstrap');
    logger.error('❌ Failed to start the server', error);
    process.exit(1);
  }`
      );
    }
  }

  fs.writeFileSync(mainTsPath, mainTs);
  logSuccess("✅ Swagger configuré avec succès !");
}

module.exports = { setupSwagger };
