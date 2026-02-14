// src/utils/generators/application/dtoUpdater.js
const fs = require("fs");
const { updateFile, capitalize } = require("../../userInput");

async function patchDtoWithRelation(newEntityName, targetName, useSwagger) {
  const dtoPath = `src/${newEntityName.toLowerCase()}/application/dtos/${newEntityName.toLowerCase()}.dto.ts`;
  const targetLow = targetName.toLowerCase();
  const targetCap = capitalize(targetName);

  // 1. Préparation du bloc de code selon Swagger
  let fieldCode = "";

  if (useSwagger) {
    fieldCode = `
  @ApiProperty({
    example: '550e8400-e29b-41d4-a716-446655440000',
    description: 'The unique identifier of the related ${targetCap}',
  })
  @IsUUID()
  ${targetLow}Id!: string;`;
  } else {
    fieldCode = `
  @IsUUID()
  ${targetLow}Id!: string;`;
  }

  // 2. Injection dans CreateDto
  // On injecte juste après l'ouverture de la classe
  await updateFile({
    path: dtoPath,
    pattern: new RegExp(`export class Create${capitalize(newEntityName)}Dto {`),
    replacement: `export class Create${capitalize(newEntityName)}Dto {${fieldCode}\n`,
  });

  // 3. Injection dans UpdateDto (Optionnel mais recommandé si non géré par PartialType)
  // Si ton UpdateDto n'utilise pas PartialType(CreateDto), il faut aussi patcher l'Update
  const fileContent = fs.readFileSync(dtoPath, "utf8");
  if (!fileContent.includes("extends PartialType")) {
    const updateFieldCode = fieldCode
      .replace("@IsUUID()", "@IsOptional()\n  @IsUUID()")
      .replace("Id!: string", "Id?: string");
    await updateFile({
      path: dtoPath,
      pattern: new RegExp(
        `export class Update${capitalize(newEntityName)}Dto {`,
      ),
      replacement: `export class Update${capitalize(newEntityName)}Dto {${updateFieldCode}\n`,
    });
  }
}
module.exports = { patchDtoWithRelation };
