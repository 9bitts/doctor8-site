#!/usr/bin/env node
import fs from "node:fs";

const file = "src/lib/professional-landing-content.ts";
let s = fs.readFileSync(file, "utf8");

const fixes = [
  ["r\u00e1pido", null], // noop anchor
  ["r?pido", "r\u00e1pido"],
  ["priorizaci?n", "priorizaci\u00f3n"],
  ["psicol?gica", "psicol\u00f3gica"],
  ["psicolog?a", "psicolog\u00eda"],
  ["reeducaci?n", "reeducaci\u00f3n"],
  ["Documentaci?n", "Documentaci\u00f3n"],
  ["documentaci?n", "documentaci\u00f3n"],
  ["situaci?n", "situaci\u00f3n"],
  ["diferen\u00e7a ? sem", "diferen\u00e7a \u2014 sem"],
  ["diferencia ? atiende", "diferencia \u2014 atiende"],
  ["autom\u00e1ticos ? todo", "autom\u00e1ticos \u2014 todo"],
  ["// English ? abbreviated", "// English ? abbreviated"],
];

for (const [, to] of fixes) {
  if (!to) continue;
}
for (const [from, to] of fixes.filter(([, to]) => to)) {
  s = s.split(from).join(to);
}

fs.writeFileSync(file, s, "utf8");

const corrupted = [...s.matchAll(/[a-zA-Z]\?[a-zA-Z]/g)].map((m) => m[0]);
console.log("Remaining letter?letter:", [...new Set(corrupted)]);
console.log("Remaining ' ? ':", (s.match(/ \? /g) || []).length);
