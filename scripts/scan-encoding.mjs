#!/usr/bin/env node
/**
 * Scans src/ for known UTF-8 corruption patterns (replaced accents as ?).
 * Run: node scripts/scan-encoding.mjs
 * Exit 1 if any hits found (for CI).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const SRC = path.join(ROOT, "src");
const SKIP = new Set(["node_modules", ".next"]);

/** Known corruption substrings (question mark standing in for accented letters). */
const BAD_LITERALS = [
  "verifica??o",
  "Pol?tica",
  "Usu?rio",
  "USU?RIO",
  "N?o.",
  "Endere?o",
  "publicit?ria",
  "servi?os",
  ": ? o",
  ": ? a",
  "como est?o",
  "como est?o",
];

function walk(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (SKIP.has(ent.name)) continue;
    const p = path.join(dir, ent.name);
    if (ent.isDirectory()) walk(p, out);
    else if (/\.(tsx?|mjs)$/.test(ent.name)) out.push(p);
  }
  return out;
}

function isNegativeTestAssertion(line) {
  return /\.not\.(toMatch|toContainText)|not\.toMatch|\\\?/.test(line);
}

const hits = [];
for (const file of walk(SRC)) {
  const rel = path.relative(ROOT, file);
  const lines = fs.readFileSync(file, "utf8").split(/\n/);
  lines.forEach((line, i) => {
    if (isNegativeTestAssertion(line)) return;
    for (const bad of BAD_LITERALS) {
      if (line.includes(bad)) {
        hits.push(`${rel}:${i + 1}: ${line.trim().slice(0, 120)}`);
        return;
      }
    }
  });
}

if (hits.length === 0) {
  console.log("No suspicious encoding patterns in src/.");
  process.exit(0);
}

console.log(`Found ${hits.length} suspicious line(s):\n`);
for (const h of hits) console.log(h);
process.exit(1);
