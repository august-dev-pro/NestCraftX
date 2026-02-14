const { updateFile } = require("../../userInput");

// src/utils/generators/infrastructure/mapperUpdater.js
async function patchMapperWithRelation(newEntityName, targetName) {
  const mapperPath = `src/${newEntityName.toLowerCase()}/infrastructure/mappers/${newEntityName.toLowerCase()}.mapper.ts`;
  const targetLow = targetName.toLowerCase();

  // 1. ToDomain : Ajouter l'argument au constructeur de l'entité
  await updateFile({
    path: mapperPath,
    pattern:
      /(toDomain\(data: any\): .* \{[\s\S]*?return new .*?\()([\s\S]*?)(\);)/m,
    replacement: `$1$2 data.${targetLow}Id$3`,
  });

  // 2. ToPersistence : Ajouter le champ pour Prisma
  await updateFile({
    path: mapperPath,
    pattern: /(toPersistence\(dto: .* \{[\s\S]*?return \{)/m,
    replacement: `$1\n      ${targetLow}Id: dto.${targetLow}Id,`,
  });

  // 3. PATCH toUpdatePersistence → add FK update condition
  await updateFile({
    path: mapperPath,
    pattern: /(toUpdatePersistence\(dto: .*?\{\s*const data: any = \{\};)/m,
    replacement: `$1\n\n    if (dto.${targetLow}Id !== undefined) data.${targetLow}Id = dto.${targetLow}Id;`,
  });
}

module.exports = { patchMapperWithRelation };
