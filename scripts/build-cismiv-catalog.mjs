/** Build CISMIV lab exam catalog from extracted PDF text (names only, no codes). */
import fs from "node:fs";
import path from "node:path";

const raw = fs.readFileSync(path.join(import.meta.dirname, "cismiv-raw.txt"), "utf8");
const lines = raw.split(/\r?\n/);

const names = [];
let pending = "";

function stripCode(name) {
  return name
    .replace(/^\d+\s+\d{2}\.\d{2}\.\d{2}\.\d{3}-\d\s+/i, "")
    .replace(/^\d{2}\.\d{2}\.\d{2}\.\d{3}-\d\s+/i, "")
    .replace(/^\d{9,}\s+/i, "")
    .replace(/\s+[\d]+([.,]\d+)?\s*$/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function pushName(s) {
  const n = stripCode(s);
  if (n.length >= 4 && /[A-Za-z?-?]/.test(n) && !/^-- \d+ of/.test(n)) {
    names.push(n);
  }
}

for (const line of lines) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("node :") || trimmed.startsWith("Warning:")) continue;
  if (/^TABELA DE EXAMES/i.test(trimmed)) continue;
  if (/^Ite\s*m/i.test(trimmed)) continue;
  if (/^C?digo|^Valor|^PROCEDIMENTO|^Unit?rio/i.test(trimmed)) continue;
  if (/^-- \d+ of \d+ --$/.test(trimmed)) continue;

  const withCode = trimmed.match(/^\d+\s+(\d{2}\.\d{2}\.\d{2}\.\d{3}-\d)\s+(.+)$/);
  if (withCode) {
    if (pending) pushName(pending);
    pending = withCode[2];
    continue;
  }

  if (/^\d+\s+\d{2}\.\d{2}\.\d{2}\.\d{3}-\d\s+/.test(trimmed)) {
    if (pending) pushName(pending);
    pending = trimmed.replace(/^\d+\s+\d{2}\.\d{2}\.\d{2}\.\d{3}-\d\s+/, "");
    continue;
  }

  if (pending && !/^\d+\s+\d{2}\./.test(trimmed)) {
    pending += " " + trimmed;
  }
}

if (pending) pushName(pending);

const unique = [...new Set(names.map((n) => n.toUpperCase()))].sort((a, b) =>
  a.localeCompare(b, "pt"),
);

const out = `// CISMIV lab exams ? names only (source: tabela_exames_laboratoriais_cismiv.pdf)
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
