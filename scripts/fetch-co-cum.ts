/**
 * Baixa o dataset CUM (INVIMA Colômbia) via API Socrata paginada.
 * Uso: npx tsx scripts/fetch-co-cum.ts
 *
 * Salva páginas em data/cum-co/ (não versionado).
 * Retoma do último offset salvo em data/cum-co/fetch-state.json.
 */

import * as fs from "fs";
import * as path from "path";

const BASE_URL = "https://www.datos.gov.co/resource/i7cb-raxc.json";
const PAGE_LIMIT = 50_000;
const DATA_DIR = path.join(process.cwd(), "data", "cum-co");
const STATE_FILE = path.join(DATA_DIR, "fetch-state.json");
const MAX_RETRIES = 3;

type FetchState = {
  nextOffset: number;
  totalRows: number;
  completed: boolean;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function ensureDir(): void {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function readState(): FetchState {
  if (!fs.existsSync(STATE_FILE)) {
    return { nextOffset: 0, totalRows: 0, completed: false };
  }
  try {
    const raw = JSON.parse(fs.readFileSync(STATE_FILE, "utf8")) as FetchState;
    return {
      nextOffset: Number(raw.nextOffset) || 0,
      totalRows: Number(raw.totalRows) || 0,
      completed: !!raw.completed,
    };
  } catch {
    return { nextOffset: 0, totalRows: 0, completed: false };
  }
}

function writeState(state: FetchState): void {
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), "utf8");
}

function pageFilePath(offset: number): string {
  return path.join(DATA_DIR, `page-${String(offset).padStart(6, "0")}.json`);
}

async function fetchPage(offset: number): Promise<unknown[]> {
  const url = `${BASE_URL}?$limit=${PAGE_LIMIT}&$offset=${offset}`;

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      const res = await fetch(url, {
        headers: {
          Accept: "application/json",
          "User-Agent": "Doctor8/1.0 (open data catalog import)",
        },
      });

      if (!res.ok) {
        throw new Error(`HTTP ${res.status} ${res.statusText}`);
      }

      const data = (await res.json()) as unknown;
      if (!Array.isArray(data)) {
        throw new Error("Resposta inesperada: JSON não é array");
      }
      return data;
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      console.warn(`  offset ${offset} tentativa ${attempt}/${MAX_RETRIES}: ${message}`);
      if (attempt === MAX_RETRIES) throw err;
      await sleep(1500 * attempt);
    }
  }

  return [];
}

async function main() {
  ensureDir();
  const state = readState();

  if (state.completed) {
    console.log(`Fetch já concluído. Total de linhas: ${state.totalRows}.`);
    console.log("Para baixar de novo, apague data/cum-co/fetch-state.json e as páginas.");
    return;
  }

  let offset = state.nextOffset;
  let totalRows = state.totalRows;

  console.log(`INVIMA CUM (Colômbia) — retomando offset ${offset}...`);

  while (true) {
    const existingPage = pageFilePath(offset);
    let rows: unknown[];

    if (fs.existsSync(existingPage)) {
      rows = JSON.parse(fs.readFileSync(existingPage, "utf8")) as unknown[];
      console.log(`  offset ${offset}: reutilizando ${rows.length} linhas salvas`);
    } else {
      rows = await fetchPage(offset);
      fs.writeFileSync(existingPage, JSON.stringify(rows), "utf8");
      console.log(`  offset ${offset}: baixadas ${rows.length} linhas`);
    }

    if (!rows.length) {
      writeState({ nextOffset: offset, totalRows, completed: true });
      console.log(`\nConcluído. Total de linhas baixadas: ${totalRows}.`);
      break;
    }

    totalRows += rows.length;
    offset += rows.length;

    writeState({ nextOffset: offset, totalRows, completed: false });

    if (rows.length < PAGE_LIMIT) {
      writeState({ nextOffset: offset, totalRows, completed: true });
      console.log(`\nConcluído (última página). Total de linhas baixadas: ${totalRows}.`);
      break;
    }

    await sleep(400);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
