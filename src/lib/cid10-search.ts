// In-memory CID-10 search (Brazilian DATASUS catalog in scripts/cid10-catalog-data.js).
// Used by /api/cid/search so diagnosis lookup works without a seeded DB table.

import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { db } from "@/lib/db";

type CidEntry = { code: string; description: string; source?: string };

let catalog: CidEntry[] | null = null;

export function normalizeCidText(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

export function normalizeCidCode(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function loadCatalog(): CidEntry[] {
  if (catalog) return catalog;

  const dataPath = join(process.cwd(), "scripts", "cid10-catalog-data.js");
  if (!existsSync(dataPath)) {
    throw new Error(`CID-10 catalog not found at ${dataPath}`);
  }

  const raw = readFileSync(dataPath, "utf8");
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start === -1 || end === -1) {
    throw new Error("CID-10 catalog file is malformed");
  }

  catalog = JSON.parse(raw.slice(start, end + 1)) as CidEntry[];
  return catalog;
}

export function searchCid10Catalog(
  q: string,
  limit = 15,
): { code: string; description: string }[] {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];

  const qNorm = normalizeCidText(trimmed);
  const qCode = normalizeCidCode(trimmed);
  const isCodeQuery = /^[A-Za-z]/.test(trimmed) && qCode.length >= 2;
  const codePrefix = trimmed.toUpperCase();

  const matches: CidEntry[] = [];
  for (const row of loadCatalog()) {
    const descNorm = normalizeCidText(row.description);
    const rowCodeNorm = normalizeCidCode(row.code);
    const hit = isCodeQuery
      ? row.code.toUpperCase().startsWith(codePrefix)
        || rowCodeNorm.includes(qCode)
        || descNorm.includes(qNorm)
      : descNorm.includes(qNorm);

    if (hit) {
      matches.push(row);
      if (matches.length >= limit * 3) break;
    }
  }

  matches.sort((a, b) => a.code.localeCompare(b.code));
  return matches.slice(0, limit).map((r) => ({
    code: r.code,
    description: r.description,
  }));
}

export async function searchCid10FromDb(
  q: string,
  limit = 15,
): Promise<{ code: string; description: string }[]> {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];

  const qNorm = normalizeCidText(trimmed);
  const qCode = normalizeCidCode(trimmed);
  const isCodeQuery = /^[A-Za-z]/.test(trimmed) && qCode.length >= 2;

  const rows = await db.cid10Catalog.findMany({
    where: {
      active: true,
      OR: isCodeQuery
        ? [
            { code: { startsWith: trimmed.toUpperCase() } },
            { searchCode: { contains: qCode } },
            { searchDescription: { contains: qNorm } },
          ]
        : [{ searchDescription: { contains: qNorm } }],
    },
    select: { code: true, description: true },
    orderBy: [{ code: "asc" }],
    take: limit,
  });

  return rows.map((r) => ({ code: r.code, description: r.description }));
}
