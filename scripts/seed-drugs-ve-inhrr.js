// scripts/seed-drugs-ve-inhrr.js
// Importa medicamentos venezuelanos (INHRR) no DrugCatalog.
// Pr?-requisito: node scripts/fetch-inhrr-ve-drugs.js
// Uso: node scripts/seed-drugs-ve-inhrr.js

const { PrismaClient } = require("@prisma/client");
const db = new PrismaClient();

let DRUGS;
try {
  DRUGS = require("./drug-catalog-ve-inhrr.js");
} catch {
  console.error("Arquivo drug-catalog-ve-inhrr.js n?o encontrado. Rode antes:");
  console.error("  node scripts/fetch-inhrr-ve-drugs.js");
  process.exit(1);
}

const COUNTRY = "VE";
const BATCH = 500;

function norm(s) {
  return (s || "").toString().trim().toLowerCase();
}

async function main() {
  console.log(`Importando ${DRUGS.length} medicamentos VE (INHRR)...`);

  const existing = await db.drugCatalog.findMany({
    where: { country: COUNTRY },
    select: { searchName: true, searchIngredient: true, presentation: true },
  });
  const existingSet = new Set(
    existing.map((e) => `${e.searchName}|${e.searchIngredient}|${e.presentation}`)
  );
  console.log(`J? existem ${existingSet.size} registros ${COUNTRY}.`);

  const toInsert = [];
  let skipped = 0;

  for (const d of DRUGS) {
    const searchName = norm(d.name);
    if (!searchName) continue;
    const key = `${searchName}|${norm(d.activeIngredient)}|${norm(d.presentation || d.name)}`;
    if (existingSet.has(key)) {
      skipped++;
      continue;
    }
    existingSet.add(key);
    toInsert.push({
      name: d.name,
      activeIngredient: d.activeIngredient || d.name,
      presentation: d.presentation || d.name,
      manufacturer: d.manufacturer || null,
      country: COUNTRY,
      category: d.nrs ? `INHRR:${d.nrs}` : null,
      controlled: false,
      prescriptionType: null,
      searchName,
      searchIngredient: norm(d.activeIngredient || d.name),
      active: true,
    });
  }

  console.log(`A inserir: ${toInsert.length} | pulados: ${skipped}`);

  let inserted = 0;
  for (let i = 0; i < toInsert.length; i += BATCH) {
    const slice = toInsert.slice(i, i + BATCH);
    const res = await db.drugCatalog.createMany({ data: slice });
    inserted += res.count;
    console.log(`  lote ${Math.floor(i / BATCH) + 1}: +${res.count}`);
  }

  const total = await db.drugCatalog.count({ where: { country: COUNTRY } });
  console.log(`\nConclu?do. Inseridos: ${inserted}. Total VE: ${total}.`);
  process.exit(0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
