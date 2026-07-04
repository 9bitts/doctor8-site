#!/usr/bin/env node
/**
 * Ensures pt/es translation dictionaries include every key from en.
 * Run: npm run check:i18n
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const FILE = path.join(ROOT, "src/lib/i18n/translations.ts");
const src = fs.readFileSync(FILE, "utf8");

function sliceBetween(startMarker, endMarker) {
  const start = src.indexOf(startMarker);
  if (start < 0) throw new Error(`Marker not found: ${startMarker}`);
  const from = start + startMarker.length;
  const end = src.indexOf(endMarker, from);
  if (end < 0) throw new Error(`End marker not found: ${endMarker}`);
  return src.slice(from, end);
}

function extractKeys(section) {
  const keys = new Set();
  const re = /"((?:\\.|[^"\\])+)":\s*(?:"|`)/g;
  let match;
  while ((match = re.exec(section)) !== null) {
    keys.add(match[1]);
  }
  return keys;
}

function reportDiff(base, other, label) {
  const missing = [...base].filter((key) => !other.has(key)).sort();
  const extra = [...other].filter((key) => !base.has(key)).sort();
  let failed = false;

  if (missing.length) {
    failed = true;
    console.error(`${label}: missing ${missing.length} key(s):`);
    for (const key of missing.slice(0, 20)) console.error(`  - ${key}`);
    if (missing.length > 20) {
      console.error(`  ... and ${missing.length - 20} more`);
    }
  }

  if (extra.length) {
    failed = true;
    console.error(`${label}: ${extra.length} extra key(s) not in en:`);
    for (const key of extra.slice(0, 20)) console.error(`  - ${key}`);
    if (extra.length > 20) {
      console.error(`  ... and ${extra.length - 20} more`);
    }
  }

  return failed;
}

const enSection = sliceBetween("const en = {", "} as const;");
const ptSection = sliceBetween("const pt: LocaleDict = {", "const es: LocaleDict = {");
const esSection = sliceBetween("const es: LocaleDict = {", "export const dictionaries");

const enKeys = extractKeys(enSection);
const ptKeys = extractKeys(ptSection);
const esKeys = extractKeys(esSection);

let failed = false;
failed ||= reportDiff(enKeys, ptKeys, "pt vs en");
failed ||= reportDiff(enKeys, esKeys, "es vs en");

if (failed) {
  process.exit(1);
}

console.log(`i18n OK: ${enKeys.size} keys in en/pt/es`);
