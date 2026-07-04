/**
 * Importa medicamentos da CMED (LISTA DE PREùOS) para DrugCatalog.
 * Uso: npx tsx scripts/import-cmed.ts
 *
 * Prù-requisitos (executar manualmente):
 *   npm install xlsx
 *   Colocar .xls/.xlsx em data/cmed/
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import * as XLSX from "xlsx";
import {
  extractDosage,
  extractPharmaceuticalForm,
  normalizeSearchPresentation,
} from "../src/lib/medications/parse-presentation";

const db = new PrismaClient();
const CMED_DIR = path.join(process.cwd(), "data", "cmed");
const BATCH = 500;
const COUNTRY = "BR";

const REQUIRED_HEADER = "SUBSTùNCIA";
const COLUMN_ALIASES: Record<string, string[]> = {
  substancia: ["SUBSTùNCIA", "SUBSTANCIA"],
  laboratorio: ["LABORATùRIO", "LABORATORIO"],
  ggrem: ["CùDIGO GGREM", "CODIGO GGREM", "GGREM"],
  produto: ["PRODUTO"],
  apresentacao: ["APRESENTAùùO", "APRESENTACAO"],
  tarja: ["TARJA"],
};

type ParsedRow = {
  ggremCode: string;
  activeIngredient: string;
  name: string;
  manufacturer: string | null;
  presentation: string;
  controlled: boolean;
  prescriptionType: string;
  pharmaceuticalForm: string;
  dosage: string | null;
  searchName: string;
  searchIngredient: string;
  searchPresentation: string;
};

function normHeader(value: unknown): string {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toUpperCase()
    .replace(/\s+/g, " ");
}

function normLower(value: string): string {
  return value.trim().toLowerCase();
}

function formatSubstance(raw: string): string {
  return raw
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" + ");
}

function mapTarja(tarja: string): { controlled: boolean; prescriptionType: string } {
  const t = tarja.trim().toLowerCase();

  if (!t || t === "-") {
    return { controlled: false, prescriptionType: "OTC" };
  }
  if (t.includes("preta")) {
    return { controlled: true, prescriptionType: "BLACK_STRIPE" };
  }
  if (
    t.includes("vermelha sob restricao")
    || t.includes("vermelha sob restriùùo")
    || t.includes("restricao")
    || t.includes("restriùùo")
  ) {
    return { controlled: true, prescriptionType: "RED_STRIPE" };
  }
  if (t.includes("vermelha")) {
    return { controlled: false, prescriptionType: "RED_STRIPE" };
  }
  if (t.includes("venda livre")) {
    return { controlled: false, prescriptionType: "OTC" };
  }
  return { controlled: false, prescriptionType: "RX" };
}

function findHeaderRow(rows: unknown[][]): number {
  for (let i = 0; i < rows.length; i++) {
    const first = String(rows[i]?.[0] ?? "").trim();
    if (first === REQUIRED_HEADER) return i;
  }
  return -1;
}

function buildColumnMap(headerRow: unknown[]): Record<string, number> {
  const map: Record<string, number> = {};

  headerRow.forEach((cell, index) => {
    const normalized = normHeader(cell);
    for (const [key, aliases] of Object.entries(COLUMN_ALIASES)) {
      if (aliases.some((alias) => normHeader(alias) === normalized)) {
        map[key] = index;
      }
    }
  });

  if (map.substancia === undefined) {
    throw new Error(
      `Coluna SUBSTùNCIA nùo encontrada no cabeùalho. Abortando ù nùo improvise.`,
    );
  }

  return map;
}

function cellValue(row: unknown[], index: number | undefined): string {
  if (index === undefined) return "";
  const value = row[index];
  if (value === null || value === undefined) return "";
  return String(value).trim();
}

function parseWorkbookRows(filePath: string): ParsedRow[] {
  const workbook = XLSX.readFile(filePath, { cellDates: false });
  const sheetName = workbook.SheetNames.includes("Planilha1")
    ? "Planilha1"
    : workbook.SheetNames[0];

  if (!sheetName) return [];

  const sheet = workbook.Sheets[sheetName];
  const rows = XLSX.utils.sheet_to_json<unknown[]>(sheet, {
    header: 1,
    defval: "",
    raw: false,
  }) as unknown[][];

  const headerIndex = findHeaderRow(rows);
  if (headerIndex < 0) {
    throw new Error(`${path.basename(filePath)}: linha de cabeùalho SUBSTùNCIA nùo encontrada.`);
  }

  const columnMap = buildColumnMap(rows[headerIndex]);
  const parsed: ParsedRow[] = [];

  for (let i = headerIndex + 1; i < rows.length; i++) {
    const row = rows[i];
    if (!row || row.length === 0) continue;

    const substancia = cellValue(row, columnMap.substancia);
    const produto = cellValue(row, columnMap.produto);
    const apresentacao = cellValue(row, columnMap.apresentacao);
    const ggremRaw = cellValue(row, columnMap.ggrem);
    const laboratorio = cellValue(row, columnMap.laboratorio);
    const tarja = cellValue(row, columnMap.tarja);

    if (!substancia && !produto && !apresentacao && !ggremRaw) continue;

    const ggremCode = ggremRaw.trim();
    if (!ggremCode) continue;

    const activeIngredient = formatSubstance(substancia) || produto;
    const name = produto || activeIngredient;
    const presentation = apresentacao || "Diversas apresentaùùes";
    const { controlled, prescriptionType } = mapTarja(tarja);
    const pharmaceuticalForm = extractPharmaceuticalForm(presentation);
    const dosage = extractDosage(presentation);

    parsed.push({
      ggremCode,
      activeIngredient,
      name,
      manufacturer: laboratorio || null,
      presentation,
      controlled,
      prescriptionType,
      pharmaceuticalForm,
      dosage,
      searchName: normLower(name),
      searchIngredient: normLower(activeIngredient),
      searchPresentation: normalizeSearchPresentation(presentation),
    });
  }

  return parsed;
}

function listCmedFiles(): string[] {
  if (!fs.existsSync(CMED_DIR)) {
    throw new Error(`Pasta nùo encontrada: ${CMED_DIR}`);
  }

  return fs
    .readdirSync(CMED_DIR)
    .filter((file) => /\.(xls|xlsx)$/i.test(file))
    .map((file) => path.join(CMED_DIR, file));
}

async function countLegacyDuplicates(rows: ParsedRow[]): Promise<number> {
  const legacy = await db.drugCatalog.findMany({
    where: { country: COUNTRY, ggremCode: null, active: true },
    select: { searchName: true, presentation: true },
  });

  const legacyKeys = new Set(
    legacy.map((item) => `${item.searchName}|${normLower(item.presentation)}`),
  );

  let count = 0;
  for (const row of rows) {
    const key = `${row.searchName}|${normLower(row.presentation)}`;
    if (legacyKeys.has(key)) count++;
  }

  return count;
}

async function main() {
  const files = listCmedFiles();
  if (files.length === 0) {
    throw new Error(`Nenhum arquivo .xls/.xlsx encontrado em ${CMED_DIR}`);
  }

  console.log(`Arquivos CMED: ${files.map((f) => path.basename(f)).join(", ")}`);

  const allRows: ParsedRow[] = [];
  const seenGgrem = new Set<string>();

  for (const file of files) {
    const rows = parseWorkbookRows(file);
    console.log(`  ${path.basename(file)}: ${rows.length} linhas vùlidas (prù-dedup)`);
    for (const row of rows) {
      if (seenGgrem.has(row.ggremCode)) continue;
      seenGgrem.add(row.ggremCode);
      allRows.push(row);
    }
  }

  const totalRead = allRows.length;
  let inserted = 0;
  let updated = 0;
  let ignored = 0;
  let unrecognizedForms = 0;

  for (const row of allRows) {
    if (row.pharmaceuticalForm === "Outro") unrecognizedForms++;
  }

  for (let i = 0; i < allRows.length; i += BATCH) {
    const slice = allRows.slice(i, i + BATCH);

    await Promise.all(
      slice.map(async (row) => {
        try {
          const existing = await db.drugCatalog.findUnique({
            where: { ggremCode: row.ggremCode },
            select: { id: true },
          });

          await db.drugCatalog.upsert({
            where: { ggremCode: row.ggremCode },
            create: {
              ggremCode: row.ggremCode,
              name: row.name,
              activeIngredient: row.activeIngredient,
              presentation: row.presentation,
              manufacturer: row.manufacturer,
              country: COUNTRY,
              category: null,
              controlled: row.controlled,
              prescriptionType: row.prescriptionType,
              pharmaceuticalForm: row.pharmaceuticalForm,
              dosage: row.dosage,
              searchName: row.searchName,
              searchIngredient: row.searchIngredient,
              searchPresentation: row.searchPresentation,
              active: true,
            },
            update: {
              name: row.name,
              activeIngredient: row.activeIngredient,
              presentation: row.presentation,
              manufacturer: row.manufacturer,
              country: COUNTRY,
              controlled: row.controlled,
              prescriptionType: row.prescriptionType,
              pharmaceuticalForm: row.pharmaceuticalForm,
              dosage: row.dosage,
              searchName: row.searchName,
              searchIngredient: row.searchIngredient,
              searchPresentation: row.searchPresentation,
              active: true,
            },
          });

          if (existing) updated++;
          else inserted++;
        } catch {
          ignored++;
        }
      }),
    );

    console.log(`  lote ${Math.floor(i / BATCH) + 1}: processados ${Math.min(i + BATCH, allRows.length)}/${allRows.length}`);
  }

  const legacyDuplicates = await countLegacyDuplicates(allRows);

  console.log("\n=== Resumo import CMED ===");
  console.log(`Total lido (GGREM ùnicos): ${totalRead}`);
  console.log(`Inseridos: ${inserted}`);
  console.log(`Atualizados: ${updated}`);
  console.log(`Ignorados (linhas invùlidas/erro): ${ignored}`);
  console.log(`Formas nùo reconhecidas (Outro): ${unrecognizedForms}`);
  console.log(
    `Possùveis duplicados CMED ù ANVISA legado (mesmo searchName + presentation, sem ggremCode): ${legacyDuplicates}`,
  );
  console.log("(Registros ANVISA/VE/US sem ggremCode nùo foram alterados.)");
}

main()
  .catch((error) => {
    console.error("ERRO:", error instanceof Error ? error.message : error);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
