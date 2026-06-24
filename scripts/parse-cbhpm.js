// scripts/parse-cbhpm.js
// Parses CBHPM 2012 extracted text and writes scripts/cbhpm-catalog-data.js
// Source: Tabela-CBHPM-Geral.pdf (AMB 2012)
// Usage: node scripts/parse-cbhpm.js [path-to-extract.txt]

const fs = require("fs");
const path = require("path");

const inputPath =
  process.argv[2] ||
  path.join(__dirname, "cbhpm-2012-extract.txt");

if (!fs.existsSync(inputPath)) {
  console.error(`Input not found: ${inputPath}`);
  console.error("Place the PDF text extract at scripts/cbhpm-2012-extract.txt or pass a path.");
  process.exit(1);
}

const text = fs.readFileSync(inputPath, "utf8");
const PROC_RE = /^(\d(?:\.\d+)+-\d)\s+(.+?)\s*\.\.\./;
let currentGroup = "";
const items = [];

for (const line of text.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed) continue;

  const groupMatch = trimmed.match(
    /^([A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ\s\/\-]+)\s*\((\d[\d.]+-\d)\)/
  );
  if (groupMatch) {
    currentGroup = groupMatch[1].trim();
    continue;
  }

  const procMatch = trimmed.match(PROC_RE);
  if (procMatch) {
    const code = procMatch[1];
    const name = procMatch[2].trim();
    const chapter = code.split(".")[0];
    items.push({ code, name, group: currentGroup, chapter });
  }
}

const outPath = path.join(__dirname, "cbhpm-catalog-data.js");
const out =
  "// Auto-generated from CBHPM 2012 (AMB). Run: node scripts/parse-cbhpm.js\n" +
  "module.exports = " +
  JSON.stringify(items) +
  ";\n";

fs.writeFileSync(outPath, out);
console.log(`Parsed ${items.length} procedures → ${outPath}`);
