/**
 * Gera data/florais/seed.json a partir do catálogo estático (Bach + Saint Germain).
 *
 * Uso: npx tsx scripts/generate-florais-seed.ts
 */

import * as fs from "fs";
import * as path from "path";
import { FLORAL_CATALOG } from "@/lib/florais-catalog/data";
import { floraisReferencePt } from "@/lib/i18n/florais-reference-i18n";

function tr(key: string): string {
  const value = floraisReferencePt[key];
  if (!value) {
    throw new Error(`[florais-seed] Tradução PT ausente: ${key}`);
  }
  return value;
}

const PRECAUCOES =
  "Conservar em local fresco, protegido da luz. Uso sublingual ou diluído em água. " +
  "Não substitui avaliação clínica ou tratamento convencional quando indicado.";

const POSOLOGIA_PADRAO =
  "4 gotas, 4 vezes ao dia, em água ou sob a língua. Rescue: conforme necessidade em situações agudas.";

const entries = FLORAL_CATALOG.map((item) => {
  const detalhes: Record<string, string> = {
    sistema: item.category,
  };
  if (item.groupKey) detalhes.grupoEmocional = tr(item.groupKey);
  if (item.negKey) detalhes.estadoNegativo = tr(item.negKey);
  if (item.posKey) detalhes.estadoPositivo = tr(item.posKey);

  return {
    slug: item.slug,
    nome: tr(item.labelKey),
    nomesAlternativos: [] as string[],
    indicacoes: tr(item.indicationKey),
    contraindicacoes: "",
    precaucoes: PRECAUCOES,
    posologia: POSOLOGIA_PADRAO,
    detalhes,
  };
});

const outDir = path.join(process.cwd(), "data", "florais");
const outFile = path.join(outDir, "seed.json");
fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(outFile, `${JSON.stringify(entries, null, 2)}\n`, "utf8");

console.log(`[florais-seed] ${entries.length} itens → ${outFile}`);
