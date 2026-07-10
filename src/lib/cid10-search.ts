// In-memory CID-10 search (Brazilian DATASUS catalog in scripts/cid10-catalog-data.js).
// Used by /api/cid/search so diagnosis lookup works without a seeded DB table.

import { createRequire } from "module";
import { join } from "path";

type CidEntry = { code: string; description: string; source?: string };

let catalog: CidEntry[] | null = null;

function normalize(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function normalizeCode(s: string): string {
  return s.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function loadCatalog(): CidEntry[] {
  if (catalog) return catalog;
  const require = createRequire(join(process.cwd(), "package.json"));
  catalog = require(join(process.cwd(), "scripts", "cid10-catalog-data.js")) as CidEntry[];
  return catalog;
}

export function searchCid10Catalog(
  q: string,
  limit = 15,
): { code: string; description: string }[] {
  const trimmed = q.trim();
  if (trimmed.length < 2) return [];

  const qNorm = normalize(trimmed);
  const qCode = normalizeCode(trimmed);
  const isCodeQuery = /^[A-Za-z]/.test(trimmed) && qCode.length >= 2;
  const codePrefix = trimmed.toUpperCase();

  const matches: CidEntry[] = [];
  for (const row of loadCatalog()) {
    const descNorm = normalize(row.description);
    const rowCodeNorm = normalizeCode(row.code);
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
