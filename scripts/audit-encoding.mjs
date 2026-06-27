#!/usr/bin/env node
import fs from "node:fs";
import { getProLandingContent } from "../src/lib/professional-landing-content.ts";

function collectStrings(obj, p = "", out = []) {
  if (typeof obj === "string") {
    out.push({ path: p, value: obj });
    return out;
  }
  if (Array.isArray(obj)) {
    for (let i = 0; i < obj.length; i++) collectStrings(obj[i], `${p}[${i}]`, out);
  } else if (obj && typeof obj === "object") {
    for (const [k, v] of Object.entries(obj)) collectStrings(v, p ? `${p}.${k}` : k, out);
  }
  return out;
}

function suspicious(s) {
  if (/[a-zA-Z\u00C0-\u024F]\?[a-zA-Z\u00C0-\u024F]/.test(s)) return "accent?";
  if (/\?\?/.test(s)) return "double?";
  if (/ [?] /.test(s)) return "dash?";
  if (/[�� ��]/.test(s)) return "mojibake";
  return null;
}

for (const lang of ["pt", "en", "es"]) {
  const c = getProLandingContent(lang);
  const bad = collectStrings(c).filter((x) => suspicious(x.value));
  console.log(`\n=== ${lang.toUpperCase()} suspicious: ${bad.length} ===`);
  for (const b of bad) console.log(`  ${b.path}: ${JSON.stringify(b.value.slice(0, 160))}`);
}

// Typos / duplicate words
const typoPatterns = [
  /Historial con historial/i,
  /conformidad con estandar[^e]/i,
  /telesalu[^d]/i,
  /historial e historial/i,
];
for (const lang of ["pt", "en", "es"]) {
  const c = getProLandingContent(lang);
  const strings = collectStrings(c);
  const typos = strings.filter((x) => typoPatterns.some((re) => re.test(x.value)));
  if (typos.length) {
    console.log(`\n=== ${lang.toUpperCase()} typos ===`);
    for (const t of typos) console.log(`  ${t.path}: ${JSON.stringify(t.value.slice(0, 160))}`);
  }
}

const raw = fs.readFileSync("src/lib/professional-landing-content.ts", "utf8");
const badLines = [];
for (const line of raw.split(/\r?\n/)) {
  if (suspicious(line)) badLines.push(line.trim().slice(0, 200));
}
console.log(`\n=== RAW suspicious lines: ${badLines.length} ===`);
for (const l of badLines.slice(0, 20)) console.log(" ", l);
