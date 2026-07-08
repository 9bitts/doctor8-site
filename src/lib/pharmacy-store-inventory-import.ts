import { db } from "@/lib/db";

export type InventoryImportRow = {
  line: number;
  drugCatalogId?: string;
  ggremCode?: string;
  name?: string;
  activeIngredient?: string;
  presentation?: string;
  priceCents: number;
  stockQty?: number;
  ean?: string;
  sku?: string;
};

export type InventoryImportError = {
  line: number;
  message: string;
};

export type InventoryImportResult = {
  rowsTotal: number;
  rowsMatched: number;
  rowsCreated: number;
  rowsUpdated: number;
  rowsSkipped: number;
  errors: InventoryImportError[];
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
  codigo_ggrem: "ggrem",
  ggrem_code: "ggrem",
  cod_ggrem: "ggrem",
  drug_catalog_id: "drug_id",
  id: "drug_id",
  nome: "name",
  medicamento: "name",
  principio_ativo: "active_ingredient",
  ingrediente: "active_ingredient",
  apresentacao: "presentation",
  preco: "price",
  preco_reais: "price",
  price: "price",
  price_cents: "price_cents",
  valor: "price",
  estoque: "stock",
  quantidade: "stock",
  stock_qty: "stock",
  ean: "ean",
  codigo_barras: "ean",
  sku: "sku",
  codigo_interno: "sku",
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

function parseStock(raw: string): number | undefined {
  const v = raw.trim();
  if (!v) return undefined;
  const n = parseInt(v.replace(/\D/g, ""), 10);
  return Number.isFinite(n) && n >= 0 ? n : undefined;
}

export function parseInventoryCsv(text: string): {
  rows: InventoryImportRow[];
  errors: InventoryImportError[];
} {
  const lines = text
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { rows: [], errors: [{ line: 0, message: "Arquivo vazio" }] };
  }

  const delimiter = detectDelimiter(lines[0]);
  const headerCells = parseCsvLine(lines[0], delimiter);
  const hasHeader = headerCells.some((h) => {
    const n = normalizeHeader(h);
    return n in HEADER_ALIASES || n === "ggrem" || n === "drug_id";
  });

  const dataLines = hasHeader ? lines.slice(1) : lines;
  const headerMap: Record<string, number> = {};

  if (hasHeader) {
    headerCells.forEach((cell, idx) => {
      const norm = normalizeHeader(cell);
      const key = HEADER_ALIASES[norm] || norm;
      headerMap[key] = idx;
    });
  } else {
    headerMap.name = 0;
    headerMap.presentation = 1;
    headerMap.price = 2;
    if (headerCells.length > 3) headerMap.stock = 3;
  }

  const rows: InventoryImportRow[] = [];
  const errors: InventoryImportError[] = [];

  for (let i = 0; i < dataLines.length; i++) {
    const lineNum = hasHeader ? i + 2 : i + 1;
    const cells = parseCsvLine(dataLines[i], delimiter);
    if (cells.every((c) => !c.trim())) continue;

    const get = (key: string) => {
      const idx = headerMap[key];
      return idx !== undefined ? cells[idx]?.trim() : undefined;
    };

    const priceKey = headerMap.price_cents !== undefined ? "price_cents" : "price";
    const priceRaw = get("price") || get("price_cents") || "";
    const priceCents = parsePriceToCents(priceRaw, priceKey);

    if (!priceCents) {
      errors.push({ line: lineNum, message: "Preço inválido ou ausente" });
      continue;
    }

    rows.push({
      line: lineNum,
      drugCatalogId: get("drug_id"),
      ggremCode: get("ggrem"),
      name: get("name"),
      activeIngredient: get("active_ingredient"),
      presentation: get("presentation"),
      priceCents,
      stockQty: parseStock(get("stock") || ""),
      ean: get("ean"),
      sku: get("sku"),
    });
  }

  return { rows, errors };
}

async function resolveDrugCatalogId(row: InventoryImportRow): Promise<string | null> {
  if (row.drugCatalogId) {
    const byId = await db.drugCatalog.findFirst({
      where: { id: row.drugCatalogId, active: true, country: "BR" },
      select: { id: true },
    });
    if (byId) return byId.id;
  }

  if (row.ggremCode) {
    const ggrem = row.ggremCode.replace(/\D/g, "");
    const byGgrem = await db.drugCatalog.findFirst({
      where: { ggremCode: ggrem, active: true, country: "BR" },
      select: { id: true },
    });
    if (byGgrem) return byGgrem.id;
  }

  const name = row.name?.trim().toLowerCase();
  if (name) {
    const presentation = row.presentation?.trim().toLowerCase();
    const ingredient = row.activeIngredient?.trim().toLowerCase();

    const candidates = await db.drugCatalog.findMany({
      where: {
        active: true,
        country: "BR",
        AND: [
          {
            OR: [
              { searchName: { contains: name } },
              { name: { contains: row.name!, mode: "insensitive" } },
            ],
          },
          ...(ingredient
            ? [{ searchIngredient: { contains: ingredient } }]
            : []),
          ...(presentation
            ? [{ presentation: { contains: row.presentation!, mode: "insensitive" as const } }]
            : []),
        ],
      },
      select: { id: true },
      take: 1,
    });
    if (candidates[0]) return candidates[0].id;
  }

  return null;
}

export async function applyInventoryImport(
  pharmacyStoreId: string,
  rows: InventoryImportRow[],
  parseErrors: InventoryImportError[],
): Promise<InventoryImportResult> {
  const result: InventoryImportResult = {
    rowsTotal: rows.length,
    rowsMatched: 0,
    rowsCreated: 0,
    rowsUpdated: 0,
    rowsSkipped: 0,
    errors: [...parseErrors],
  };

  for (const row of rows) {
    const drugCatalogId = await resolveDrugCatalogId(row);
    if (!drugCatalogId) {
      result.rowsSkipped++;
      result.errors.push({
        line: row.line,
        message: "Medicamento não encontrado no catálogo Doctor8 (use codigo_ggrem ou nome+apresentacao)",
      });
      continue;
    }

    result.rowsMatched++;

    const existing = await db.pharmacyStoreInventoryItem.findUnique({
      where: {
        pharmacyStoreId_drugCatalogId: { pharmacyStoreId, drugCatalogId },
      },
    });

    if (existing) {
      await db.pharmacyStoreInventoryItem.update({
        where: { id: existing.id },
        data: {
          priceCents: row.priceCents,
          stockQty: row.stockQty ?? existing.stockQty,
          ean: row.ean ?? existing.ean,
          sku: row.sku ?? existing.sku,
          available: true,
        },
      });
      result.rowsUpdated++;
    } else {
      await db.pharmacyStoreInventoryItem.create({
        data: {
          pharmacyStoreId,
          drugCatalogId,
          priceCents: row.priceCents,
          stockQty: row.stockQty,
          ean: row.ean,
          sku: row.sku,
          available: true,
        },
      });
      result.rowsCreated++;
    }
  }

  return result;
}

export const INVENTORY_CSV_TEMPLATE = `codigo_ggrem;preco;estoque
nome;principio_ativo;apresentacao;preco;estoque
drug_catalog_id;preco;estoque
1234567890123;12,90;50
Dipirona;Dipirona Sódica;500mg comprimido cx 20;8,50;100`;
