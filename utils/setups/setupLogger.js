const fs = require("fs");
const { updateFile } = require("../userInput");

async function setupBootstrapLogger() {
  // Modification de main.ts pour intégrer Swagger
  const mainTsPath = "src/main.ts";
  let mainTs = fs.readFileSync(mainTsPath, "utf8");

  if (!mainTs.includes("await app.listen")) return mainTs;

  // Injecte les imports si non présents
  await updateFile({
    path: mainTsPath,
    pattern: "import { ValidationPipe } from '@nestjs/common';",
    replacement: `import { Logger, ValidationPipe } from '@nestjs/common';`,
  });
  /*  if (!mainTs.includes("Logger")) {
  } */

  if (!mainTs.includes("ConfigService")) {
    await updateFile({
      path: mainTsPath,
      pattern: "import { NestFactory } from '@nestjs/core';",
      replacement: `import { NestFactory } from '@nestjs/core';
      import { ConfigService } from '@nestjs/config';`,
    });
  }

  // Injecte la récupération des variables
  if (!mainTs.includes("const host = configService.get<string>('HOST'")) {
    await updateFile({
      path: mainTsPath,
      pattern: "const app = await NestFactory.create(AppModule);",
      replacement: `const app = await NestFactory.create(AppModule);
      const configService = app.get(ConfigService);
      const port = configService.get<number>('PORT', 3000);
      const host = configService.get<string>('HOST', '0.0.0.0');`,
    });
  }

  // Remplace le démarrage de l'app par le bloc stylisé
  return await updateFile({
    path: mainTsPath,
    pattern: "await app.listen(process.env.PORT ?? 3000);",
    replacement: `try {
    await app.listen(port, host);

    const logger = new Logger('Bootstrap');
    logger.log(\`🚀 Application running on: \${await app.getUrl()}\`);
    logger.log(\`🌐 Environment: \${process.env.NODE_ENV || 'development'}\`);
    logger.log(\`📡 Listening on \${host}:\${port}\`);
  } catch (error) {
    const logger = new Logger('Bootstrap');
    logger.error('❌ Failed to start the server', error);
    process.exit(1);
  }`,
  });
}
module.exports = { setupBootstrapLogger };
