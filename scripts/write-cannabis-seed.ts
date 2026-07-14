/**
 * Gera data/cannabis/seed.json a partir do catálogo TypeScript.
 * Uso: npx tsx scripts/write-cannabis-seed.ts
 */

import * as fs from "fs";
import * as path from "path";
import { buildCannabisSeedJson } from "@/lib/medicina-natural/cannabis-catalog";

const outDir = path.join(process.cwd(), "data", "cannabis");
const outFile = path.join(outDir, "seed.json");

fs.mkdirSync(path.dirname(outFile), { recursive: true });
const payload = buildCannabisSeedJson();
fs.writeFileSync(outFile, `${JSON.stringify(payload, null, 2)}\n`, "utf8");
console.log(`[cannabis-seed] Wrote ${payload.itens.length} items to ${outFile}`);
