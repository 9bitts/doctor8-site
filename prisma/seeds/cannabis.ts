/**
 * Seed de Cannabis medicinal — catálogo genérico por composição.
 * Base regulatória: RDC 327/2019, RDC 660/2022, RDC 1.015/2026.
 *
 * Uso: npx tsx prisma/seeds/cannabis.ts
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import {
  CannabisLoteInputSchema,
  normalizeCannabisLoteItem,
  type MedicinaNaturalItemRecord,
} from "@/lib/medicina-natural/item-types";
import { upsertMedicinaNaturalItems } from "./medicina-natural-shared";

function loadRecords(filePath: string): MedicinaNaturalItemRecord[] {
  const raw = JSON.parse(fs.readFileSync(filePath, "utf8"));
  const parsed = CannabisLoteInputSchema.parse(raw);
  return parsed.itens.map(normalizeCannabisLoteItem);
}

export async function seedCannabis(db: PrismaClient): Promise<void> {
  const file = path.join(process.cwd(), "data", "cannabis", "seed.json");
  if (!fs.existsSync(file)) {
    console.log("[cannabis] Aguardando data/cannabis/seed.json — rode: npx tsx scripts/write-cannabis-seed.ts");
    return;
  }
  const records = loadRecords(file);
  const stats = await upsertMedicinaNaturalItems(db, records, "slug");
  console.log("[cannabis] Upsert:", stats);
}

if (require.main === module) {
  const db = new PrismaClient();
  seedCannabis(db)
    .finally(() => db.$disconnect())
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
