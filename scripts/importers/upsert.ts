/**
 * Shared upsert for DrugCatalog imports keyed by (country, externalCode).
 */

import { PrismaClient } from "@prisma/client";
import { normalizeSearchPresentation } from "../../src/lib/medications/parse-presentation";
import type { CountryDrugRecord, UpsertStats } from "./types";

const BATCH = 500;
const OTHER_EXAMPLE_LIMIT = 20;

function normLower(value: string): string {
  return value.trim().toLowerCase();
}

function toDbRow(record: CountryDrugRecord) {
  return {
    name: record.name,
    activeIngredient: record.activeIngredient,
    presentation: record.presentation,
    manufacturer: record.manufacturer,
    country: record.country,
    category: record.category ?? null,
    controlled: record.controlled ?? false,
    prescriptionType: record.prescriptionType ?? null,
    externalCode: record.externalCode,
    pharmaceuticalForm: record.pharmaceuticalForm,
    dosage: record.dosage,
    searchName: normLower(record.name),
    searchIngredient: normLower(record.activeIngredient),
    searchPresentation: normalizeSearchPresentation(record.presentation),
    active: true,
  };
}

export async function upsertCountryDrugCatalog(
  db: PrismaClient,
  records: CountryDrugRecord[],
): Promise<UpsertStats> {
  const stats: UpsertStats = {
    read: records.length,
    inserted: 0,
    updated: 0,
    ignored: 0,
    otherForm: 0,
    otherFormExamples: [],
    noDosage: 0,
  };

  for (const record of records) {
    if (!record.externalCode?.trim()) {
      stats.ignored++;
      continue;
    }

    if (record.pharmaceuticalForm === "Outro") {
      stats.otherForm++;
      if (stats.otherFormExamples.length < OTHER_EXAMPLE_LIMIT) {
        stats.otherFormExamples.push(
          `${record.externalCode}: ${record.presentation}`,
        );
      }
    }

    if (!record.dosage?.trim()) stats.noDosage++;
  }

  for (let i = 0; i < records.length; i += BATCH) {
    const slice = records.slice(i, i + BATCH);

    await Promise.all(
      slice.map(async (record) => {
        if (!record.externalCode?.trim()) return;

        const data = toDbRow(record);
        const where = {
          country_externalCode: {
            country: record.country,
            externalCode: record.externalCode,
          },
        } as const;

        try {
          const existing = await db.drugCatalog.findUnique({
            where,
            select: { id: true },
          });

          await db.drugCatalog.upsert({
            where,
            create: data,
            update: {
              name: data.name,
              activeIngredient: data.activeIngredient,
              presentation: data.presentation,
              manufacturer: data.manufacturer,
              category: data.category,
              controlled: data.controlled,
              prescriptionType: data.prescriptionType,
              pharmaceuticalForm: data.pharmaceuticalForm,
              dosage: data.dosage,
              searchName: data.searchName,
              searchIngredient: data.searchIngredient,
              searchPresentation: data.searchPresentation,
              active: true,
            },
          });

          if (existing) stats.updated++;
          else stats.inserted++;
        } catch {
          stats.ignored++;
        }
      }),
    );

    console.log(
      `  lote ${Math.floor(i / BATCH) + 1}: processados ${Math.min(i + BATCH, records.length)}/${records.length}`,
    );
  }

  return stats;
}

export function printUpsertStats(stats: UpsertStats, country: string): void {
  console.log("\n--- Resumo ---");
  console.log(`País: ${country}`);
  console.log(`Lidos: ${stats.read}`);
  console.log(`Inseridos: ${stats.inserted}`);
  console.log(`Atualizados: ${stats.updated}`);
  console.log(`Ignorados: ${stats.ignored}`);
  console.log(`Forma "Outro": ${stats.otherForm}`);
  if (stats.otherFormExamples.length) {
    console.log(`Exemplos "Outro" (até ${OTHER_EXAMPLE_LIMIT}):`);
    for (const example of stats.otherFormExamples) {
      console.log(`  - ${example}`);
    }
  }
  console.log(`Sem dosagem: ${stats.noDosage}`);
}
