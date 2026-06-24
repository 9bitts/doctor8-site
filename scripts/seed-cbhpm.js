// scripts/seed-cbhpm.js
// Populates CbhpmCatalog from scripts/cbhpm-catalog-data.js
// Usage: cd /app && node scripts/seed-cbhpm.js

const { PrismaClient } = require("@prisma/client");
const PROCEDURES = require("./cbhpm-catalog-data.js");

const db = new PrismaClient();
const EDITION = "2012";
const BATCH = 200;

function normalizeName(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeCode(s) {
  return s.replace(/\D/g, "");
}

async function main() {
  console.log(`Seeding CbhpmCatalog with ${PROCEDURES.length} procedures (edition ${EDITION})...`);

  const deleted = await db.cbhpmCatalog.deleteMany({ where: { edition: EDITION } });
  console.log(`Cleared ${deleted.count} existing rows.`);

  let inserted = 0;
  for (let i = 0; i < PROCEDURES.length; i += BATCH) {
    const slice = PROCEDURES.slice(i, i + BATCH).map((p) => ({
      code: p.code,
      name: p.name,
      chapter: p.chapter,
      groupName: p.group || null,
      searchName: normalizeName(p.name),
      searchCode: normalizeCode(p.code),
      edition: EDITION,
      active: true,
    }));
    const res = await db.cbhpmCatalog.createMany({ data: slice, skipDuplicates: true });
    inserted += res.count;
    process.stdout.write(`\r  ${inserted}/${PROCEDURES.length}`);
  }

  console.log(`\nDone. Inserted ${inserted} procedures into CbhpmCatalog.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
