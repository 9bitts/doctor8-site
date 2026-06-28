import fs from "node:fs";
import { PDFParse } from "pdf-parse";

const buf = new Uint8Array(fs.readFileSync(process.argv[2]));
const parser = new PDFParse(buf);
const result = await parser.getText();
console.log(result.text);
