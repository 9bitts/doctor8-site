#!/usr/bin/env node
import fs from "node:fs";

const file = "src/lib/professional-landing-content.ts";
let s = fs.readFileSync(file, "utf8");

const fixes = [
  ["diferen\u00e7a ? sem", "diferen\u00e7a \u2014 sem"],
  ["pela manh\u00e3 ? 30", "pela manh\u00e3 \u2014 30"],
  ["por la ma\u00f1ana ? 30", "por la ma\u00f1ana \u2014 30"],
  ["autom\u00e1ticos ? todo", "autom\u00e1ticos \u2014 todo"],
  ["evoluci\u00f3n ? con", "evoluci\u00f3n \u2014 con"],
  ["\u00e0 noite ? 30", "\u00e0 noite \u2014 30"],
  ["120 ? S\u00e3o Paulo", "120 \u00b7 S\u00e3o Paulo"],
  ["Flower St ? S\u00e3o Paulo", "Flower St \u00b7 S\u00e3o Paulo"],
  ["compliance ? because", "compliance \u2014 because"],
  ["environment ? with", "environment \u2014 with"],
  ["progress ? with", "progress \u2014 with"],
];

for (const [from, to] of fixes) {
  s = s.split(from).join(to);
}

fs.writeFileSync(file, s, "utf8");

const inStr = s.match(/"[^"]*\?[^"]*"/g) || [];
console.log(`Remaining strings with ?: ${inStr.length}`);
for (const x of inStr) console.log(x.slice(0, 140));
