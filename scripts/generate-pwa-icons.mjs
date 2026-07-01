// Generates PWA PNG icons from SVG sources (D8 wordmark).
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const iconsDir = join(root, "public", "icons");

async function writePng(svgPath, outPath, size) {
  await sharp(readFileSync(svgPath))
    .resize(size, size)
    .png()
    .toFile(outPath);
  console.log(`Wrote ${outPath}`);
}

await writePng(join(iconsDir, "icon-source.svg"), join(iconsDir, "icon-192.png"), 192);
await writePng(join(iconsDir, "icon-source.svg"), join(iconsDir, "icon-512.png"), 512);
await writePng(join(iconsDir, "icon-maskable-source.svg"), join(iconsDir, "icon-512-maskable.png"), 512);
