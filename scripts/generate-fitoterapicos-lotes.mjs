#!/usr/bin/env node
/**
 * Gera lotes JSON de fitoterápicos a partir dos textos extraídos dos PDFs MFFB e FFFB.
 *
 * Uso:
 *   node scripts/generate-fitoterapicos-lotes.mjs [--validate] [--mffb-only] [--fffb-only]
 *
 * Saída:
 *   data/fitoterapicos/lote2-mffb.json         (20 espécies restantes do MFFB)
 *   data/fitoterapicos/lote{N}-fffb.json       (lotes de 18 itens novos, N=1..K)
 *   data/fitoterapicos/lote1-fffb-merge.json   (FFFB overlap MFFB — formato legacy)
 */

import fs from "fs";
import path from "path";
import { fileURLToPath, pathToFileURL } from "url";
import { generateMffbLote2, splitMffbMonographs, mffbToLoteItem, MFFB_LOTE1, MFFB_SPECIES_ORDER } from "./parse-mffb-monografias.mjs";
import { normalizeSciKey } from "./fitoterapicos-encoding.mjs";
import {
  extractFffbSpeciesFromToc,
  splitFffbMonographs,
  fffbToLoteItem,
  fffbToLegacyItem,
  isMffbOverlap,
} from "./parse-fffb-monografias.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const DATA_DIR = path.join(ROOT, "data", "fitoterapicos");

const MFFB_RAW = path.join(DATA_DIR, "raw-mffb.txt");
const FFFB_RAW = path.join(DATA_DIR, "raw-fffb.txt");
const FFFB_LOTE_SIZE = 18;

function isValidFffbLoteItem(item) {
  return Boolean(item.indicacoes?.trim() && item.posologia?.trim());
}

function isValidFffbLegacyItem(item) {
  return Boolean(item.indicacoes?.trim() && item.modoPreparo?.trim());
}

function writeJson(filename, data) {
  const out = path.join(DATA_DIR, filename);
  fs.writeFileSync(out, JSON.stringify(data, null, 2) + "\n", "utf8");
  console.log(`✓ ${filename} — ${data.itens?.length ?? data.fffb?.length ?? 0} itens`);
  return out;
}

function buildMffbLote2() {
  const raw = fs.readFileSync(MFFB_RAW, "utf8");
  const allChunks = splitMffbMonographs(raw);
  const lote2Items = allChunks
    .filter((c) => !MFFB_LOTE1.has(c.key))
    .sort((a, b) => {
      const ia = MFFB_SPECIES_ORDER.findIndex((s) => normalizeSciKey(s) === a.key);
      const ib = MFFB_SPECIES_ORDER.findIndex((s) => normalizeSciKey(s) === b.key);
      return ia - ib;
    })
    .map((c) => mffbToLoteItem(c));

  console.log(`\n[MFFB] Total monografias: ${allChunks.length}`);
  console.log(`[MFFB] Lote 1 (já seedado): ${MFFB_LOTE1.size}`);
  console.log(`[MFFB] Lote 2: ${lote2Items.length} itens`);

  const inferencias = lote2Items.map((item) => ({
    nomeCientifico: item.nomeCientifico,
    statusRegulatorio: item.statusRegulatorio,
    renisus: item.renisus,
    prescricaoObrigatoria: item.detalhesEspecificos?.prescricaoObrigatoria,
    alertaGestacaoPediatria: item.alertaGestacaoPediatria ? "sim" : "não",
  }));
  console.log("\n[MFFB lote2] Inferências para revisão humana:");
  console.table(inferencias);

  return writeJson("lote2-mffb.json", {
    _meta: {
      lote: "2 de N",
      fonte_primaria:
        "Memento Fitoterápico da Farmacopeia Brasileira (MFFB), 1ª edição, 2016 — RDC nº 84/2016",
      url_fonte: "https://www.gov.br/anvisa/en/pharmacopeia/arquivos/memento-fitoterapico.pdf",
      extracao: "parser automático sobre raw-mffb.txt — revisar antes de produção",
      observacao:
        "statusRegulatorio=MEDICAMENTO_REGISTRADO (padrão MFFB). renisus inferido por lista das 17 espécies RENISUS — confirmar oficialmente.",
      gerado_em: new Date().toISOString().slice(0, 10),
      inferencias,
    },
    itens: lote2Items,
  });
}

function inferenciasFffb(itens) {
  return itens.map((item) => ({
    nomeCientifico: item.nomeCientifico,
    statusRegulatorio: item.statusRegulatorio,
    renisus: item.renisus,
    formas: item.detalhesEspecificos?.formaFarmaceutica?.join(", "),
    alertaGestacaoPediatria: item.alertaGestacaoPediatria ? "sim" : "não",
  }));
}

function buildFffbLoteMeta(loteNum, totalLotes, speciesList, chunks, novos, itens) {
  return {
    lote: `${loteNum} de ${totalLotes} (FFFB)`,
    fonte_primaria:
      "Formulário de Fitoterápicos da Farmacopeia Brasileira (FFFB), 2ª edição, 2021 — RDC nº 463/2021",
    url_fonte: "https://www.gov.br/anvisa/pt-br/assuntos/farmacopeia/farmacopeia-brasileira",
    extracao: "parser automático sobre raw-fffb.txt — revisar antes de produção",
    observacao:
      "statusRegulatorio=PRODUTO_TRADICIONAL_NOTIFICADO (PTF/manipulação). Overlap MFFB em lote1-fffb-merge.json. Itens sem indicacoes/posologia foram filtrados.",
    gerado_em: new Date().toISOString().slice(0, 10),
    total_fffb_sumario: speciesList.length,
    total_parseados: chunks.length,
    total_validos_novos: novos.length,
    inferencias: inferenciasFffb(itens),
  };
}

function buildFffbLotes() {
  const raw = fs.readFileSync(FFFB_RAW, "utf8");
  const speciesList = extractFffbSpeciesFromToc(raw);
  const chunks = splitFffbMonographs(raw, speciesList);

  console.log(`\n[FFFB] Espécies no sumário: ${speciesList.length}`);
  console.log(`[FFFB] Monografias parseadas: ${chunks.length}`);

  const novos = [];
  const merge = [];

  for (const chunk of chunks) {
    if (isMffbOverlap(chunk.title)) {
      const legacy = fffbToLegacyItem(chunk);
      if (isValidFffbLegacyItem(legacy)) merge.push(legacy);
    } else {
      const item = fffbToLoteItem(chunk);
      if (isValidFffbLoteItem(item)) novos.push(item);
    }
  }

  console.log(`[FFFB] Novos válidos (sem overlap MFFB): ${novos.length}`);
  console.log(`[FFFB] Merge válidos (overlap MFFB): ${merge.length}`);

  const totalLotes = Math.max(1, Math.ceil(novos.length / FFFB_LOTE_SIZE));
  const written = [];

  for (let n = 0; n < totalLotes; n++) {
    const loteNum = n + 1;
    const slice = novos.slice(n * FFFB_LOTE_SIZE, (n + 1) * FFFB_LOTE_SIZE);
    if (slice.length === 0) continue;

    const filename = `lote${loteNum}-fffb.json`;
    console.log(`\n[FFFB lote${loteNum}] ${slice.length} itens — inferências:`);
    console.table(inferenciasFffb(slice));

    written.push(
      writeJson(filename, {
        _meta: buildFffbLoteMeta(loteNum, totalLotes, speciesList, chunks, novos, slice),
        itens: slice,
      }),
    );
  }

  written.push(
    writeJson("lote1-fffb-merge.json", {
      _meta: {
        tipo: "legacy-merge",
        observacao: "Espécies FFFB que já existem no MFFB — seed com normalizeFitoterapicosSeed para merge de fontes.",
        gerado_em: new Date().toISOString().slice(0, 10),
        total_validos: merge.length,
      },
      mffb: [],
      fffb: merge,
    }),
  );

  return written;
}

async function validateWithZod(files) {
  try {
    const { register } = await import("tsx/esm/api");
    register();
    const itemTypesUrl = pathToFileURL(
      path.join(ROOT, "src/lib/medicina-natural/item-types.ts"),
    ).href;
    const { FitoterapicosLoteInputSchema, FitoterapicosSeedInputSchema } = await import(
      itemTypesUrl
    );
    for (const file of files) {
      if (!fs.existsSync(file)) continue;
      const raw = JSON.parse(fs.readFileSync(file, "utf8"));
      if (raw.itens) {
        if (raw.itens.length === 0) {
          console.log(`⊘ Zod skip: ${path.basename(file)} (lote vazio)`);
          continue;
        }
        FitoterapicosLoteInputSchema.parse(raw);
        console.log(`✓ Zod OK: ${path.basename(file)} (lote, ${raw.itens.length} itens)`);
      } else {
        FitoterapicosSeedInputSchema.parse(raw);
        console.log(`✓ Zod OK: ${path.basename(file)} (legacy, ${raw.fffb?.length ?? 0} fffb)`);
      }
    }
  } catch (err) {
    console.error("✗ Validação Zod falhou:", err.message ?? err);
    if (err.errors) console.error(JSON.stringify(err.errors, null, 2));
    process.exit(1);
  }
}

async function main() {
  const args = process.argv.slice(2);
  const mffbOnly = args.includes("--mffb-only");
  const fffbOnly = args.includes("--fffb-only");
  const doValidate = args.includes("--validate") || !args.includes("--no-validate");

  const written = [];

  if (!fffbOnly) written.push(buildMffbLote2());
  if (!mffbOnly) written.push(...buildFffbLotes());

  if (doValidate && written.length) {
    console.log("\n[Validação Zod]");
    await validateWithZod(written);
  }

  console.log("\nPróximo passo (seeds no Railway, nesta ordem):");
  console.log("  npm run seed:fitoterapicos -- data/fitoterapicos/lote2-mffb.json");
  console.log("  npm run seed:fitoterapicos -- data/fitoterapicos/lote1-fffb.json");
  console.log("  npm run seed:fitoterapicos -- data/fitoterapicos/lote2-fffb.json");
  console.log("  npm run seed:fitoterapicos -- data/fitoterapicos/lote3-fffb.json");
  console.log("  npm run seed:fitoterapicos -- data/fitoterapicos/lote1-fffb-merge.json");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
