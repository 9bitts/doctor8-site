/**
 * Enriquece registros VE existentes no DrugCatalog com presentation limpa,
 * pharmaceuticalForm, dosage e searchPresentation.
 * Uso: npx tsx scripts/enrich-ve-drugs.ts
 *
 * Pré-requisitos (executar manualmente):
 *   npx prisma generate
 *   Registros VE já importados via seed-drugs-ve-inhrr
 */

import { PrismaClient } from "@prisma/client";
import { normalizeSearchPresentation } from "../src/lib/medications/parse-presentation";
import {
  extractDosageEs,
  extractPharmaceuticalFormEs,
  stripBrandFromPresentationEsDetailed,
} from "../src/lib/medications/parse-presentation-es";

const db = new PrismaClient();
const BATCH = 500;
const COUNTRY = "VE";
const OTHER_EXAMPLE_LIMIT = 20;
const STRIP_EXAMPLE_LIMIT = 10;

function deriveFields(name: string | null) {
  const rawName = (name || "").trim();
  const stripped = stripBrandFromPresentationEsDetailed(rawName);
  const cleanedPresentation = stripped.presentation;

  return {
    presentation: cleanedPresentation,
    stripMethod: stripped.method,
    pharmaceuticalForm: extractPharmaceuticalFormEs(rawName),
    dosage: extractDosageEs(rawName),
    searchPresentation: normalizeSearchPresentation(cleanedPresentation),
  };
}

async function main() {
  console.log(`Enriquecendo DrugCatalog (${COUNTRY})...`);

  let processed = 0;
  let updated = 0;
  let presentationRewritten = 0;
  let stripUnchanged = 0;
  let otherForm = 0;
  let noDosage = 0;
  const otherExamples: string[] = [];
  const rewrittenExamples: string[] = [];
  const unchangedExamples: string[] = [];
  let skip = 0;

  while (true) {
    const batch = await db.drugCatalog.findMany({
      where: { country: COUNTRY },
      select: {
        id: true,
        name: true,
        presentation: true,
        pharmaceuticalForm: true,
        dosage: true,
        searchPresentation: true,
      },
      orderBy: { id: "asc" },
      take: BATCH,
      skip,
    });

    if (!batch.length) break;

    for (const row of batch) {
      processed++;
      const next = deriveFields(row.name);

      if (next.stripMethod === "unchanged") {
        stripUnchanged++;
        if (unchangedExamples.length < STRIP_EXAMPLE_LIMIT) {
          unchangedExamples.push(row.name || row.presentation || row.id);
        }
      }

      if (next.presentation !== (row.presentation || "").trim()) {
        presentationRewritten++;
        if (rewrittenExamples.length < STRIP_EXAMPLE_LIMIT) {
          rewrittenExamples.push(`${row.presentation || row.name} -> ${next.presentation}`);
        }
      }

      if (next.pharmaceuticalForm === "Outro") {
        otherForm++;
        if (otherExamples.length < OTHER_EXAMPLE_LIMIT) {
          otherExamples.push(row.name || row.presentation || row.id);
        }
      }

      if (!next.dosage) noDosage++;

      const changed =
        row.presentation !== next.presentation
        || row.pharmaceuticalForm !== next.pharmaceuticalForm
        || row.dosage !== next.dosage
        || row.searchPresentation !== next.searchPresentation;

      if (changed) {
        await db.drugCatalog.update({
          where: { id: row.id },
          data: {
            presentation: next.presentation,
            pharmaceuticalForm: next.pharmaceuticalForm,
            dosage: next.dosage,
            searchPresentation: next.searchPresentation,
          },
        });
        updated++;
      }
    }

    skip += batch.length;
    console.log(`  processados: ${processed} | atualizados: ${updated}`);
  }

  console.log("\n--- Resumo ---");
  console.log(`Total processado: ${processed}`);
  console.log(`Total atualizado: ${updated}`);
  console.log(`Presentation reescrita: ${presentationRewritten}`);
  if (rewrittenExamples.length) {
    console.log(`Exemplos reescritos (até ${STRIP_EXAMPLE_LIMIT}):`);
    for (const example of rewrittenExamples) {
      console.log(`  - ${example}`);
    }
  }
  console.log(`Strip fallback 2 (inalterados): ${stripUnchanged}`);
  if (unchangedExamples.length) {
    console.log(`Exemplos inalterados (até ${STRIP_EXAMPLE_LIMIT}):`);
    for (const example of unchangedExamples) {
      console.log(`  - ${example}`);
    }
  }
  console.log(`Forma "Outro": ${otherForm}`);
  if (otherExamples.length) {
    console.log(`Exemplos "Outro" (até ${OTHER_EXAMPLE_LIMIT}):`);
    for (const example of otherExamples) {
      console.log(`  - ${example}`);
    }
  }
  console.log(`Sem dosagem extraída: ${noDosage}`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
