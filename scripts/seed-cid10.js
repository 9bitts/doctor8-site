// scripts/seed-cid10.js
// Populates Cid10Catalog from scripts/cid10-catalog-data.js
// Usage: node scripts/parse-cid10.js && node scripts/seed-cid10.js

const { PrismaClient } = require("@prisma/client");
const path = require("path");

const dataPath = path.join(__dirname, "cid10-catalog-data.js");
if (!require("fs").existsSync(dataPath)) {
  console.error("Missing cid10-catalog-data.js ? run: node scripts/parse-cid10.js");
  process.exit(1);
}

const ENTRIES = require("./cid10-catalog-data.js");
const db = new PrismaClient();
const BATCH = 300;

function normalizeDescription(s) {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeCode(s) {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

async function main() {
  console.log(`Seeding Cid10Catalog with ${ENTRIES.length} entries...`);

  const deleted = await db.cid10Catalog.deleteMany({});
  console.log(`Cleared ${deleted.count} existing rows.`);

  let inserted = 0;
  for (let i = 0; i < ENTRIES.length; i += BATCH) {
    const slice = ENTRIES.slice(i, i + BATCH).map((e) => ({
      code: e.code,
      description: e.description,
      searchDescription: normalizeDescription(e.description),
      searchCode: normalizeCode(e.code),
      source: e.source || "CID10",
      active: true,
    }));
    const res = await db.cid10Catalog.createMany({ data: slice, skipDuplicates: true });
    inserted += res.count;
    process.stdout.write(`\r  ${inserted}/${ENTRIES.length}`);
  }

  console.log(`\nDone. Inserted ${inserted} CID-10 codes into Cid10Catalog.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
