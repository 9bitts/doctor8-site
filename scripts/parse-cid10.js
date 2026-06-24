// scripts/parse-cid10.js
// Parses Brazilian DATASUS CID-10 CSV exports into scripts/cid10-catalog-data.js
// Source: CID10CSV.zip (SUBCATEGORIAS + CID-O CATEGORIAS)
// Usage: node scripts/parse-cid10.js [path-to-csv-dir]

const fs = require("fs");
const path = require("path");

const csvDir =
  process.argv[2] ||
  path.join(__dirname, "..", "data", "cid10", "csv");

function readCsv(name) {
  const filePath = path.join(csvDir, name);
  if (!fs.existsSync(filePath)) {
    console.error(`Missing: ${filePath}`);
    process.exit(1);
  }
  return fs.readFileSync(filePath, "latin1");
}

function parseSemicolonCsv(text) {
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = lines[0].split(";");
  const rows = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i].split(";");
    const row = {};
    header.forEach((h, idx) => {
      row[h.trim()] = (cols[idx] || "").trim();
    });
    rows.push(row);
  }
  return rows;
}

const subcats = parseSemicolonCsv(readCsv("CID-10-SUBCATEGORIAS.CSV"));
const cidO = parseSemicolonCsv(readCsv("CID-O-CATEGORIAS.CSV"));

const items = [];
const seen = new Set();

for (const row of subcats) {
  const code = row.SUBCAT;
  const description = row.DESCRICAO;
  if (!code || !description) continue;
  if (seen.has(code)) continue;
  seen.add(code);
  items.push({ code, description, source: "CID10" });
}

for (const row of cidO) {
  const code = row.CAT;
  const description = row.DESCRICAO;
  if (!code || !description) continue;
  if (seen.has(code)) continue;
  seen.add(code);
  items.push({ code, description, source: "CID-O" });
}

const outPath = path.join(__dirname, "cid10-catalog-data.js");
const out =
  "// Auto-generated from DATASUS CID-10 CSV. Run: node scripts/parse-cid10.js\n" +
  "module.exports = " +
  JSON.stringify(items) +
  ";\n";

fs.writeFileSync(outPath, out, "utf8");
console.log(`Parsed ${items.length} CID entries (${subcats.length} subcats, ${cidO.length} CID-O) ? ${outPath}`);
