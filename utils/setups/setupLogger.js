const fs = require("fs");

async function setupBootstrapLogger() {
  // Modification de main.ts pour intégrer Swagger
  const mainTsPath = "src/main.ts";
  let mainTs = fs.readFileSync(mainTsPath, "utf8");

  if (!mainTs.includes("await app.listen")) return mainTs;

  // Injecte les imports si non présents
  if (!mainTs.includes("Logger")) {
    mainTs = mainTs.replace(
      "import { NestFactory",
      "import { Logger } from '@nestjs/common';\nimport { NestFactory"
    );
  }
  if (!mainTs.includes("ConfigService")) {
    mainTs = mainTs.replace(
      "import { NestFactory",
      "import { ConfigService } from '@nestjs/config';\nimport { NestFactory"
    );
  }

  // Injecte la récupération des variables
  if (!mainTs.includes("const host = configService.get<string>('HOST'")) {
    mainTs = mainTs.replace(
      "const app = await NestFactory.create(AppModule);",
      `const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT', 3000);
  const host = configService.get<string>('HOST', '0.0.0.0');`
    );
  }

  // Remplace le démarrage de l'app par le bloc stylisé
  return mainTs.replace(
    "await app.listen(process.env.PORT ?? 3000);",
    `try {
    await app.listen(port, host);

    const logger = new Logger('Bootstrap');
    logger.log(\`🚀 Application running on: \${await app.getUrl()}\`);
    logger.log(\`🌐 Environment: \${process.env.NODE_ENV || 'development'}\`);
    logger.log(\`📡 Listening on \${host}:\${port}\`);
  } catch (error) {
    const logger = new Logger('Bootstrap');
    logger.error('❌ Failed to start the server', error);
    process.exit(1);
  }`
  );
}
module.exports = { setupBootstrapLogger };
