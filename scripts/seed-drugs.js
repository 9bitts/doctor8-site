// scripts/seed-drugs.js
// Populates the DrugCatalog table with the initial curated list.
// Run in the Railway Console (from /app), AFTER prisma db push + generate:
//   cd /app && node scripts/seed-drugs.js
// Safe to run more than once: it clears the seeded set and re-inserts.

const { PrismaClient } = require("@prisma/client");
const drugs = require("./drug-catalog-data.js");

const prisma = new PrismaClient();

async function main() {
  console.log(`Seeding DrugCatalog with ${drugs.length} drugs...`);

  // Clean slate for the catalog (this table holds only reference data, no PHI).
  const deleted = await prisma.drugCatalog.deleteMany({});
  console.log(`Removed ${deleted.count} existing catalog rows.`);

  let inserted = 0;
  for (const d of drugs) {
    await prisma.drugCatalog.create({
      data: {
        name: d.name,
        activeIngredient: d.activeIngredient,
        presentation: d.presentation,
        manufacturer: d.manufacturer || null,
        country: d.country || "BR",
        category: d.category || null,
        controlled: !!d.controlled,
        prescriptionType: d.prescriptionType || null,
        searchName: d.name.toLowerCase(),
        searchIngredient: d.activeIngredient.toLowerCase(),
        active: true,
      },
    });
    inserted++;
  }

  console.log(`Done. Inserted ${inserted} drugs into DrugCatalog.`);
}

main()
  .catch((e) => {
    console.error("Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
