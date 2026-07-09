import { db } from "@/lib/db";
import type { ExamCategory, LaboratoryType } from "@prisma/client";
import { slugifyOrganizationName } from "@/lib/cnpj";

export type ExamImportRow = {
  line: number;
  examCatalogId?: string;
  code?: string;
  name?: string;
  category?: ExamCategory;
  priceCents: number;
  internalCode?: string;
};

export type ExamImportError = {
  line: number;
  message: string;
};

export type ExamImportResult = {
  rowsTotal: number;
  rowsMatched: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsSkipped: number;
  errors: ExamImportError[];
};

function normalizeHeader(h: string): string {
  return h
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_");
}

const HEADER_ALIASES: Record<string, string> = {
  exam_catalog_id: "exam_id",
  id: "exam_id",
  codigo: "code",
  codigo_tuss: "code",
  codigo_cbhpm: "code",
  tuss: "code",
  nome: "name",
  exame: "name",
  procedimento: "name",
  categoria: "category",
  tipo: "category",
  preco: "price",
  preco_reais: "price",
  price: "price",
  price_cents: "price_cents",
  valor: "price",
  codigo_interno: "internal_code",
  sku: "internal_code",
};

function detectDelimiter(line: string): "," | ";" | "\t" {
  const semicolons = (line.match(/;/g) || []).length;
  const commas = (line.match(/,/g) || []).length;
  const tabs = (line.match(/\t/g) || []).length;
  if (tabs >= semicolons && tabs >= commas && tabs > 0) return "\t";
  if (semicolons > commas) return ";";
  return ",";
}

function parseCsvLine(line: string, delimiter: string): string[] {
  const out: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (!inQuotes && ch === delimiter) {
      out.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  out.push(current.trim());
  return out;
}

function parsePriceToCents(raw: string, headerKey: string): number | null {
  const v = raw.trim();
  if (!v) return null;
  if (headerKey === "price_cents") {
    const n = parseInt(v.replace(/\D/g, ""), 10);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  const normalized = v.replace(/[^\d,.-]/g, "").replace(",", ".");
  const num = parseFloat(normalized);
  if (!Number.isFinite(num) || num <= 0) return null;
  return Math.round(num * 100);
}

function parseCategory(raw: string): ExamCategory | undefined {
  const v = raw.trim().toLowerCase();
  if (!v) return undefined;
  if (v.includes("imagem") || v.includes("imaging") || v.includes("raio") || v.includes("tomograf") || v.includes("resson")) {
    return "IMAGING";
  }
  if (v.includes("sangue") || v.includes("blood") || v.includes("labor") || v.includes("analise") || v.includes("clinic")) {
    return "BLOOD";
  }
  return undefined;
}

function normalizeSearchName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function defaultCategoryForLab(labType: LaboratoryType): ExamCategory {
  return labType === "IMAGING" ? "IMAGING" : "BLOOD";
}

async function uniqueExamSlug(base: string): Promise<string> {
  let slug = slugifyOrganizationName(base);
  let attempt = 0;
  while (true) {
    const candidate = attempt === 0 ? slug : `${slug}-${attempt}`;
    const existing = await db.examCatalog.findUnique({ where: { slug: candidate } });
    if (!existing) return candidate;
    attempt++;
  }
}

async function resolveExamCatalog(
  row: ExamImportRow,
  defaultCategory: ExamCategory,
): Promise<{ id: string } | null> {
  if (row.examCatalogId) {
    const byId = await db.examCatalog.findUnique({ where: { id: row.examCatalogId } });
    if (byId) return { id: byId.id };
  }

  if (row.code) {
    const byCode = await db.examCatalog.findFirst({ where: { code: row.code.trim() } });
    if (byCode) return { id: byCode.id };
  }

  if (row.name) {
    const searchName = normalizeSearchName(row.name);
    const category = row.category ?? defaultCategory;
    const byName = await db.examCatalog.findFirst({
      where: { searchName, category },
    });
    if (byName) return { id: byName.id };

    const slug = await uniqueExamSlug(row.name);
    const created = await db.examCatalog.create({
      data: {
        name: row.name.trim(),
        slug,
        category,
        code: row.code?.trim() || undefined,
        searchName,
      },
    });
    return { id: created.id };
  }

  return null;
}

export function parseExamCsv(csvText: string): {
  rows: ExamImportRow[];
  errors: ExamImportError[];
} {
  const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
  const errors: ExamImportError[] = [];
  const rows: ExamImportRow[] = [];

  if (lines.length === 0) {
    return { rows, errors: [{ line: 0, message: "Arquivo vazio" }] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headerCells = parseCsvLine(lines[0], delimiter);
  const headerKeys = headerCells.map((h) => {
    const norm = normalizeHeader(h);
    return HEADER_ALIASES[norm] ?? norm;
  });

  const hasHeader = headerKeys.some((k) =>
    ["name", "price", "price_cents", "exam_id", "code"].includes(k),
  );
  const startLine = hasHeader ? 1 : 0;

  if (!hasHeader && lines.length > 0) {
    headerKeys.length = 0;
    const firstCells = parseCsvLine(lines[0], delimiter);
    if (firstCells.length >= 2) {
      for (let i = 0; i < firstCells.length; i++) {
        headerKeys.push(i === 0 ? "name" : i === 1 ? "price" : `col_${i}`);
      }
    }
  }

  for (let i = startLine; i < lines.length; i++) {
    const lineNum = i + 1;
    const cells = parseCsvLine(lines[i], delimiter);
    if (cells.every((c) => !c.trim())) continue;

    const record: Record<string, string> = {};
    headerKeys.forEach((key, idx) => {
      if (cells[idx] !== undefined) record[key] = cells[idx];
    });

    const priceHeader = record.price_cents !== undefined ? "price_cents" : "price";
    const priceRaw = record.price_cents ?? record.price ?? "";
    const priceCents = parsePriceToCents(priceRaw, priceHeader);

    if (!priceCents) {
      errors.push({ line: lineNum, message: "Preço inválido ou ausente" });
      continue;
    }

    const name = record.name?.trim();
    const examCatalogId = record.exam_id?.trim();
    const code = record.code?.trim();
    const category = record.category ? parseCategory(record.category) : undefined;

    if (!name && !examCatalogId && !code) {
      errors.push({ line: lineNum, message: "Informe nome, código ou exam_catalog_id" });
      continue;
    }

    rows.push({
      line: lineNum,
      examCatalogId,
      code,
      name,
      category,
      priceCents,
      internalCode: record.internal_code?.trim(),
    });
  }

  return { rows, errors };
}

export async function applyExamImport(
  laboratoryId: string,
  rows: ExamImportRow[],
  parseErrors: ExamImportError[],
  labType: LaboratoryType,
): Promise<ExamImportResult> {
  const defaultCategory = defaultCategoryForLab(labType);
  const result: ExamImportResult = {
    rowsTotal: rows.length,
    rowsMatched: 0,
    rowsCreated: 0,
    rowsUpdated: 0,
    rowsSkipped: 0,
    errors: [...parseErrors],
  };

  for (const row of rows) {
    const catalog = await resolveExamCatalog(row, defaultCategory);
    if (!catalog) {
      result.rowsSkipped++;
      result.errors.push({ line: row.line, message: "Exame não identificado" });
      continue;
    }

    result.rowsMatched++;

    const existing = await db.laboratoryExamItem.findUnique({
      where: {
        laboratoryId_examCatalogId: { laboratoryId, examCatalogId: catalog.id },
      },
    });

    if (existing) {
      await db.laboratoryExamItem.update({
        where: { id: existing.id },
        data: {
          priceCents: row.priceCents,
          internalCode: row.internalCode ?? existing.internalCode,
          available: true,
        },
      });
      result.rowsUpdated++;
    } else {
      await db.laboratoryExamItem.create({
        data: {
          laboratoryId,
          examCatalogId: catalog.id,
          priceCents: row.priceCents,
          internalCode: row.internalCode,
          available: true,
        },
      });
      result.rowsCreated++;
    }
  }

  return result;
}

export function examCsvTemplate(labType: LaboratoryType): string {
  const categoryHint = labType === "IMAGING" ? "imagem" : labType === "BLOOD" ? "sangue" : "sangue ou imagem";
  return [
    "nome,preco,categoria,codigo,codigo_interno",
    `Hemograma completo,45.00,sangue,40304361,HEMO-001`,
    `Glicemia em jejum,18.50,sangue,,GLIC-001`,
    labType !== "BLOOD" ? `Raio-X tórax PA e perfil,120.00,imagem,,RX-TOR-001` : "",
    `# categoria: ${categoryHint} (opcional — usa o tipo do laboratório se omitido)`,
  ]
    .filter(Boolean)
    .join("\n");
}
