import { readFileSync } from "fs";
import { join } from "path";
import { PrismaClient } from "@prisma/client";
import { anvisaBularioSearchUrl } from "../src/lib/drug-leaflet/anvisa-links";
import { extractPosologyExcerpt, parseBulaTextToSections } from "../src/lib/drug-leaflet/parse-bula-text";
import { leafletSectionTitle } from "../src/lib/drug-leaflet/section-titles";
import { normalizeActiveIngredientKey } from "../src/lib/drug-leaflet/normalize-ingredient";
import type { DrugLeafletSectionKey } from "../src/lib/drug-leaflet/types";

const db = new PrismaClient();

type SeedSection = {
  key: DrugLeafletSectionKey;
  content: string;
  defaultOpen?: boolean;
};

type SeedRow = {
  activeIngredient: string;
  ggremCode?: string;
  productName?: string;
  country?: string;
  sections: SeedSection[];
  posologyExcerpt?: string;
  rawText?: string;
};

function resolveSections(row: SeedRow) {
  if (row.rawText?.trim()) {
    const parsed = parseBulaTextToSections(row.rawText);
    if (parsed.length > 0) return parsed;
  }
  return row.sections.map((s) => ({
    key: s.key,
    title: leafletSectionTitle(s.key),
    content: s.content.trim(),
    defaultOpen: s.defaultOpen ?? s.key === "posologia",
  }));
}

async function upsertLeaflet(row: SeedRow) {
  const activeIngredient = row.activeIngredient.trim();
  const activeIngredientKey = normalizeActiveIngredientKey(activeIngredient);
  if (!activeIngredientKey) return { skipped: true as const, reason: "empty ingredient" };

  const country = row.country?.trim() || "BR";
  const sections = resolveSections(row);
  const posologyExcerpt =
    row.posologyExcerpt?.trim() || extractPosologyExcerpt(sections) || null;
  const externalUrl = anvisaBularioSearchUrl(activeIngredient);

  const data = {
    activeIngredientKey,
    activeIngredient,
    productName: row.productName?.trim() || null,
    country,
    ggremCode: row.ggremCode?.trim() || null,
    sections,
    posologyExcerpt,
    externalUrl,
    source: row.rawText ? "anvisa_text" : "curated",
    active: true,
  };

  if (row.ggremCode?.trim()) {
    const existing = await db.drugLeaflet.findUnique({
      where: { ggremCode: row.ggremCode.trim() },
    });
    if (existing) {
      await db.drugLeaflet.update({ where: { id: existing.id }, data });
      return { updated: true as const, key: activeIngredientKey };
    }
  }

  const byIngredient = await db.drugLeaflet.findFirst({
    where: { country, activeIngredientKey, ggremCode: null },
  });

  if (byIngredient) {
    await db.drugLeaflet.update({ where: { id: byIngredient.id }, data });
    return { updated: true as const, key: activeIngredientKey };
  }

  await db.drugLeaflet.create({ data });
  return { created: true as const, key: activeIngredientKey };
}

async function main() {
  const seedPath = join(process.cwd(), "data", "bulas", "seed.json");
  const rows = JSON.parse(readFileSync(seedPath, "utf8")) as SeedRow[];

  let created = 0;
  let updated = 0;
  let skipped = 0;

  for (const row of rows) {
    const result = await upsertLeaflet(row);
    if ("created" in result && result.created) created++;
    else if ("updated" in result && result.updated) updated++;
    else skipped++;
    console.log(`  ${row.activeIngredient}: ${JSON.stringify(result)}`);
  }

  const total = await db.drugLeaflet.count({ where: { active: true } });
  console.log(`\nDone. created=${created} updated=${updated} skipped=${skipped} total_active=${total}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(() => db.$disconnect());
