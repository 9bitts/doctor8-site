import fs from "node:fs";
import path from "node:path";
import { PDFParse } from "pdf-parse";
import { spawnSync } from "node:child_process";

const pdfPath = path.join(import.meta.dirname, "cismiv.pdf");
const rawPath = path.join(import.meta.dirname, "cismiv-raw.txt");

const buf = new Uint8Array(fs.readFileSync(pdfPath));
const parser = new PDFParse(buf);
const result = await parser.getText();
fs.writeFileSync(rawPath, result.text, "utf8");

const build = spawnSync(process.execPath, [path.join(import.meta.dirname, "build-cismiv-catalog.mjs")], {
  stdio: "inherit",
});

process.exit(build.status ?? 1);
