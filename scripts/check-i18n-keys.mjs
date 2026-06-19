import fs from "fs";

const content = fs.readFileSync("src/lib/i18n/translations.ts", "utf8");
const extractKeys = (block) => [...block.matchAll(/"([^"]+)":/g)].map((m) => m[1]);

const enBlock = content.match(/const en = \{([\s\S]*?)\} as const;/)[1];
const ptBlock = content.match(/const pt: LocaleDict = \{([\s\S]*?)\};\s*const es/)[1];
const esBlock = content.match(/const es: LocaleDict = \{([\s\S]*?)\};\s*export const dictionaries/)[1];

const en = new Set(extractKeys(enBlock));
const pt = new Set(extractKeys(ptBlock));
const es = new Set(extractKeys(esBlock));

console.log("Counts:", { en: en.size, pt: pt.size, es: es.size });
console.log("Missing in PT:", [...en].filter((k) => !pt.has(k)));
console.log("Missing in ES:", [...en].filter((k) => !es.has(k)));
