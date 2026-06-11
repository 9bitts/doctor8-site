// scripts/map-existing-documents.js
// Maps existing MedicalDocuments (which only have `type`) to the new categoryId,
// using the category's legacyType. Run AFTER seed-categories.js:
//   cd /app && node scripts/map-existing-documents.js
// Safe to run more than once (only fills documents that still have no categoryId).

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

async function main() {
  // Build a map legacyType -> categoryId
  const cats = await db.category.findMany({ where: { legacyType: { not: null } } });
  const byLegacy = {};
  for (const c of cats) byLegacy[c.legacyType] = c.id;

  console.log("Legacy map:", byLegacy);

  // Find documents without a category yet
  const docs = await db.medicalDocument.findMany({
    where: { categoryId: null },
    select: { id: true, type: true },
  });
  console.log(`Documents without category: ${docs.length}`);

  let mapped = 0, skipped = 0;
  for (const d of docs) {
    const categoryId = byLegacy[d.type];
    if (categoryId) {
      await db.medicalDocument.update({ where: { id: d.id }, data: { categoryId } });
      mapped++;
    } else {
      skipped++;
    }
  }
  console.log(`Mapped: ${mapped}, Skipped (no matching category): ${skipped}`);
}

main()
  .catch((e) => { console.error("MAP ERROR:", e); process.exit(1); })
  .finally(async () => { await db.$disconnect(); });
