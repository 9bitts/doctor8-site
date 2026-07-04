/**
 * Importa medicamentos venezuelanos (INHRR) no DrugCatalog.
 * Prù-requisito: node scripts/fetch-inhrr-ve-drugs.js
 * Uso: npx tsx scripts/seed-drugs-ve-inhrr.ts
 *
 * Versùo com enriquecimento (presentation limpa, pharmaceuticalForm, dosage, searchPresentation).
 * O script legado scripts/seed-drugs-ve-inhrr.js permanece intacto.
 */

import { PrismaClient } from "@prisma/client";
import { normalizeSearchPresentation } from "../src/lib/medications/parse-presentation";
import {
  extractDosageEs,
  extractPharmaceuticalFormEs,
  stripBrandFromPresentationEs,
} from "../src/lib/medications/parse-presentation-es";

type InhrrDrug = {
  nrs?: string;
  name: string;
  activeIngredient?: string;
  presentation?: string;
  manufacturer?: string | null;
};

// eslint-disable-next-line @typescript-eslint/no-require-imports
const DRUGS: InhrrDrug[] = require("./drug-catalog-ve-inhrr.js");

const db = new PrismaClient();
const COUNTRY = "VE";
const BATCH = 500;

function norm(s: string | null | undefined): string {
  return (s || "").toString().trim().toLowerCase();
}

function catalogKey(
  searchName: string,
  searchIngredient: string,
  presentation: string,
): string {
  return `${norm(searchName)}|${norm(searchIngredient)}|${norm(presentation)}`;
}

function enrichFromInhrr(d: InhrrDrug) {
  const name = d.name.trim();
  const presentation = stripBrandFromPresentationEs(name);
  return {
    presentation,
    pharmaceuticalForm: extractPharmaceuticalFormEs(name),
    dosage: extractDosageEs(name),
    searchPresentation: normalizeSearchPresentation(presentation),
  };
}

async function main() {
  console.log(`Importando ${DRUGS.length} medicamentos VE (INHRR)...`);

  const existing = await db.drugCatalog.findMany({
    where: { country: COUNTRY },
    select: { searchName: true, searchIngredient: true, presentation: true },
  });
  const existingSet = new Set(
    existing.map((e) => catalogKey(e.searchName, e.searchIngredient, e.presentation)),
  );
  console.log(`Jù existem ${existingSet.size} registros ${COUNTRY}.`);

  const toInsert = [];
  let skipped = 0;

  for (const d of DRUGS) {
    const searchName = norm(d.name);
    if (!searchName) continue;

    const enriched = enrichFromInhrr(d);
    const key = catalogKey(searchName, d.activeIngredient || d.name, enriched.presentation);
    if (existingSet.has(key)) {
      skipped++;
      continue;
    }

    existingSet.add(key);
    toInsert.push({
      name: d.name,
      activeIngredient: d.activeIngredient || d.name,
      presentation: enriched.presentation,
      manufacturer: d.manufacturer || null,
      country: COUNTRY,
      category: d.nrs ? `INHRR:${d.nrs}` : null,
      controlled: false,
      prescriptionType: null,
      searchName,
      searchIngredient: norm(d.activeIngredient || d.name),
      active: true,
      pharmaceuticalForm: enriched.pharmaceuticalForm,
      dosage: enriched.dosage,
      searchPresentation: enriched.searchPresentation,
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
  console.log(`\nConcluùdo. Inseridos: ${inserted}. Total VE: ${total}.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
