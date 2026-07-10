/** Build lab exam catalog from TABELA DE PREÇO PARTICULAR.xls (names only, no codes/prices). */
import fs from "node:fs";
import path from "node:path";
import XLSX from "xlsx";

const xlsPath =
  process.argv[2] ??
  path.join(import.meta.dirname, "tabela-preco-particular.xls");

if (!fs.existsSync(xlsPath)) {
  console.error(`File not found: ${xlsPath}`);
  process.exit(1);
}

const wb = XLSX.readFile(xlsPath);
const ws = wb.Sheets[wb.SheetNames[0]];
const rows = XLSX.utils.sheet_to_json(ws, { header: 1, defval: "" });

const names = [];
for (let i = 2; i < rows.length; i++) {
  const desc = String(rows[i][1] ?? "").trim();
  if (desc && !/^DESCRI/i.test(desc)) names.push(desc);
}

const unique = [...new Set(names.map((n) => n.toUpperCase()))].sort((a, b) =>
  a.localeCompare(b, "pt"),
);

const out = `// Lab exam catalog — names only (source: TABELA DE PREÇO PARTICULAR.xls)
export const CISMIV_LAB_EXAMS: readonly string[] = ${JSON.stringify(unique, null, 2)} as const;

export function searchCismivLabExams(query: string, limit = 20): string[] {
  const q = query.trim().toLowerCase();
  if (q.length < 2) return [];
  return CISMIV_LAB_EXAMS.filter((name) => name.toLowerCase().includes(q)).slice(0, limit);
}
`;

const target = path.join(import.meta.dirname, "..", "src", "lib", "cismiv-lab-exams.ts");
fs.writeFileSync(target, out, "utf8");
console.log(`Wrote ${unique.length} exams to ${target}`);
