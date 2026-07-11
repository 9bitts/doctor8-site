/**
 * Seed all fitoterápico lotes (MFFB + FFFB) in sequence.
 *
 *   npm run seed:fitoterapicos:all
 */
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { seedFitoterapicos } from "./fitoterapicos";

const LOTES = [
  "lote1-mffb.json",
  "lote2-mffb.json",
  "lote1-fffb.json",
  "lote2-fffb.json",
  "lote3-fffb.json",
  "lote4-fffb.json",
  "lote1-fffb-merge.json",
];

async function main() {
  const db = new PrismaClient();
  const base = path.join(process.cwd(), "data", "fitoterapicos");

  try {
    for (const file of LOTES) {
      const filePath = path.join(base, file);
      console.log(`[fitoterapicos:all] → ${file}`);
      await seedFitoterapicos(db, { filePath });
    }
  } finally {
    await db.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
