/**
 * Importa medicamentos Colômbia (INVIMA CUM) para DrugCatalog.
 * Uso: npx tsx scripts/import-co-cum.ts
 *
 * Pré-requisito: npx tsx scripts/fetch-co-cum.ts
 * Pré-requisito schema: npx prisma db push && npx prisma generate
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import { translatePharmaceuticalFormFromEs } from "../src/lib/medications/parse-presentation-es";
import type { CountryDrugRecord } from "./importers/types";
import { printUpsertStats, upsertCountryDrugCatalog } from "./importers/upsert";

const db = new PrismaClient();
const DATA_DIR = path.join(process.cwd(), "data", "cum-co");
const COUNTRY = "CO";

const REQUIRED_COLUMNS = [
  "expedientecum",
  "consecutivocum",
  "producto",
  "titular",
  "estadoregistro",
  "estadocum",
  "muestramedica",
  "principioactivo",
  "formafarmaceutica",
] as const;

type CumRow = Record<string, string | undefined>;

function normField(value: string | undefined): string {
  return (value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function cleanBrandName(producto: string): string {
  return producto
    .replace(/[®™]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function cumCode(row: CumRow): string | null {
  const exp = (row.expedientecum || "").trim();
  const con = (row.consecutivocum || "").trim();
  if (!exp || !con) return null;
  return `${exp}-${con}`;
}

function passesFilter(row: CumRow): boolean {
  if (normField(row.estadoregistro) !== "vigente") return false;
  if (normField(row.estadocum) !== "activo") return false;
  if (normField(row.muestramedica) === "si") return false;
  return !!cumCode(row);
}

function buildDosagePart(cantidad: string | undefined, unidad: string | undefined): string {
  const c = (cantidad || "").trim();
  const u = (unidad || "").trim();
  if (!c && !u) return "";
  if (!u) return c;
  if (!c) return u;
  return `${c} ${u}`;
}

function consolidateGroup(rows: CumRow[]): CountryDrugRecord | null {
  const externalCode = cumCode(rows[0]);
  if (!externalCode) return null;

  const principles: { name: string; dosage: string }[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const name = (row.principioactivo || "").trim();
    if (!name) continue;
    const key = normField(name);
    if (seen.has(key)) continue;
    seen.add(key);
    principles.push({
      name,
      dosage: buildDosagePart(row.cantidad, row.unidadmedida),
    });
  }

  if (!principles.length) return null;

  const activeIngredient = principles.map((p) => p.name).join(" + ");
  const dosage = principles
    .map((p) => p.dosage)
    .filter(Boolean)
    .join(" + ") || null;

  const formaOriginal = (rows[0].formafarmaceutica || "").trim();
  const pharmaceuticalForm = translatePharmaceuticalFormFromEs(formaOriginal);

  let presentation = [dosage, formaOriginal].filter(Boolean).join(" ").trim();
  const desc = (rows[0].descripcioncomercial || "").trim();
  if (desc) {
    const truncated = desc.length > 120 ? `${desc.slice(0, 120).trim()}…` : desc;
    presentation = `${presentation} - ${truncated}`;
  }

  const producto = cleanBrandName(rows[0].producto || "");
  if (!producto) return null;

  return {
    name: producto,
    activeIngredient,
    presentation,
    manufacturer: (rows[0].titular || "").trim() || null,
    pharmaceuticalForm,
    dosage,
    externalCode,
    country: COUNTRY,
    category: (rows[0].atc || "").trim() || null,
    controlled: false,
    prescriptionType: null,
  };
}

function loadRawRows(): CumRow[] {
  if (!fs.existsSync(DATA_DIR)) {
    throw new Error(`Pasta não encontrada: ${DATA_DIR}. Rode fetch-co-cum.ts antes.`);
  }

  const files = fs
    .readdirSync(DATA_DIR)
    .filter((f) => /^page-\d+\.json$/i.test(f))
    .sort();

  if (!files.length) {
    throw new Error(`Nenhuma página em ${DATA_DIR}. Rode fetch-co-cum.ts antes.`);
  }

  const rows: CumRow[] = [];
  for (const file of files) {
    const page = JSON.parse(fs.readFileSync(path.join(DATA_DIR, file), "utf8")) as unknown;
    if (!Array.isArray(page)) continue;
    for (const item of page) {
      if (item && typeof item === "object") {
        rows.push(item as CumRow);
      }
    }
  }
  return rows;
}

function validateColumns(rows: CumRow[]): void {
  const sample = rows.find((r) => Object.keys(r).length > 0);
  if (!sample) {
    throw new Error("Dataset vazio — nenhuma linha para validar colunas.");
  }

  const keys = new Set(Object.keys(sample).map((k) => k.toLowerCase()));
  const missing = REQUIRED_COLUMNS.filter((col) => !keys.has(col));
  if (missing.length) {
    throw new Error(
      `Colunas ausentes no dataset INVIMA: ${missing.join(", ")}. `
      + `Verifique se a API mudou antes de importar.`,
    );
  }
}

function buildRecords(rows: CumRow[]): {
  records: CountryDrugRecord[];
  filteredOut: number;
  compositeGroups: number;
} {
  const filtered = rows.filter(passesFilter);
  const filteredOut = rows.length - filtered.length;

  const groups = new Map<string, CumRow[]>();
  for (const row of filtered) {
    const code = cumCode(row)!;
    const list = groups.get(code) || [];
    list.push(row);
    groups.set(code, list);
  }

  let compositeGroups = 0;
  const records: CountryDrugRecord[] = [];

  for (const group of groups.values()) {
    if (group.length > 1) compositeGroups++;
    const record = consolidateGroup(group);
    if (record) records.push(record);
  }

  return { records, filteredOut, compositeGroups };
}

async function main() {
  console.log("Importando CUM Colômbia (INVIMA)...");

  const rawRows = loadRawRows();
  console.log(`Linhas brutas carregadas: ${rawRows.length}`);
  validateColumns(rawRows);

  const { records, filteredOut, compositeGroups } = buildRecords(rawRows);
  console.log(`Filtradas (não Vigente/Activo ou amostra médica): ${filteredOut}`);
  console.log(`CUMs únicos a importar: ${records.length}`);
  console.log(`CUMs compostos (múltiplas linhas): ${compositeGroups}`);

  const stats = await upsertCountryDrugCatalog(db, records);
  printUpsertStats(stats, COUNTRY);

  const total = await db.drugCatalog.count({ where: { country: COUNTRY } });
  console.log(`Total CO no catálogo: ${total}.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
