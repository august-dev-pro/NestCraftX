const { patchDtoWithRelation } = require("../application/dtoUpdater");
const { patchMapperWithRelation } = require("../infrastructure/mapperUpdater");

function resolveForeignKeyOwner(source, target, relationType) {
  switch (relationType) {
    case "1-n":
      // FK on the N side → target
      return {
        ownerEntity: target,
        relatedEntity: source,
      };

    case "n-1":
      // FK on the N side → source
      return {
        ownerEntity: source,
        relatedEntity: target,
      };

    case "1-1":
      // Convention: FK on source side
      return {
        ownerEntity: source,
        relatedEntity: target,
      };

    case "n-n":
      // Pivot table → no FK field
      return null;

    default:
      throw new Error(`❌ Unknown relation type: ${relationType}`);
  }
}

async function applyRelationPatches({
  source,
  target,
  relationType,
  useSwagger,
}) {
  const owner = resolveForeignKeyOwner(source, target, relationType);

  if (!owner) {
    // console.log("ℹ️ n-n relation detected → pivot table, skipping DTO patch");
    return;
  }

  // Patch DTO
  await patchDtoWithRelation(
    owner.ownerEntity,
    owner.relatedEntity,
    useSwagger,
  );

  // Patch Mapper
  await patchMapperWithRelation(owner.ownerEntity, owner.relatedEntity);
}

module.exports = {
  resolveForeignKeyOwner,
  applyRelationPatches,
};
