/**
 * Seed de Fitoterápicos — MFFB + FFFB
 *
 * Uso (após confirmação do schema e migration):
 *   npx tsx prisma/seeds/fitoterapicos.ts [caminho/para/dados.json]
 *
 * O JSON deve seguir FitoterapicosSeedInputSchema (ver item-types.ts).
 * Dados vazios por padrão — aguardando JSON parseado do usuário.
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import {
  type DetalhesFitoterapico,
  FitoterapicosLoteInputSchema,
  type FitoterapicosSeedInput,
  FitoterapicosSeedInputSchema,
  isFitoterapicosLoteInput,
  type MedicinaNaturalItemRecord,
  normalizeFitoterapicoLoteItem,
  type FonteReferencia,
  type MffbMonografiaInput,
  type StatusRegulatorio,
} from "@/lib/medicina-natural/item-types";
import {
  buildMedicinaNaturalSearchText,
  normalizeSearchText,
  sanitizeNomeAlternativo,
  slugFromNomeCientifico,
} from "@/lib/medicina-natural/search-text";
import {
  EDICAO_FFFB,
  EDICAO_MFFB,
  FONTE_FFFB,
  FONTE_MFFB,
  upsertMedicinaNaturalItems,
} from "./medicina-natural-shared";

const MFFB_FONTE = { fonte: FONTE_MFFB, edicao: EDICAO_MFFB };
const FFFB_FONTE = { fonte: FONTE_FFFB, edicao: EDICAO_FFFB };

function inferMffbStatus(entry: MffbMonografiaInput): StatusRegulatorio {
  if (entry.statusRegulatorio) return entry.statusRegulatorio;
  return entry.renisus
    ? "MEDICAMENTO_REGISTRADO"
    : "PRODUTO_TRADICIONAL_NOTIFICADO";
}

function mergeFontes(
  existing: FonteReferencia[],
  entry: FonteReferencia,
): FonteReferencia[] {
  const idx = existing.findIndex(
    (f) => f.fonte === entry.fonte && f.edicao === entry.edicao,
  );
  if (idx === -1) return [...existing, entry];
  const merged = { ...existing[idx] };
  if (entry.campos?.length) {
    merged.campos = [...new Set([...(merged.campos ?? []), ...entry.campos])];
  }
  const next = [...existing];
  next[idx] = merged;
  return next;
}

function buildSearchText(
  nome: string,
  nomeCientifico: string,
  alternativos: string[],
): string {
  const safe = alternativos
    .map(sanitizeNomeAlternativo)
    .filter((x): x is string => Boolean(x));
  return buildMedicinaNaturalSearchText([nome, nomeCientifico], safe);
}

/** Normaliza nome científico para chave de merge (sem acentos, minúsculas). */
export function mergeKeyNomeCientifico(nome: string): string {
  return normalizeSearchText([nome]);
}

type MergeBucket = {
  nomeCientifico: string;
  nome: string;
  nomesAlternativos: string[];
  indicacoes: string;
  contraindicacoes: string;
  precaucoes: string;
  interacoesMedicamentosas: string | null;
  posologia: string;
  viaAdministracao: string[];
  alertaGestacaoPediatria: string | null;
  statusRegulatorio: StatusRegulatorio;
  renisus: boolean;
  detalhes: DetalhesFitoterapico;
  fontes: FonteReferencia[];
};

function emptyBucket(nomeCientifico: string, nome: string): MergeBucket {
  return {
    nomeCientifico,
    nome,
    nomesAlternativos: [],
    indicacoes: "",
    contraindicacoes: "",
    precaucoes: "",
    interacoesMedicamentosas: null,
    posologia: "",
    viaAdministracao: [],
    alertaGestacaoPediatria: null,
    statusRegulatorio: "PRODUTO_TRADICIONAL_NOTIFICADO",
    renisus: false,
    detalhes: {},
    fontes: [],
  };
}

/**
 * Mescla MFFB (dados clínicos) + FFFB (modo de preparo) por nomeCientifico.
 * Exportada para testes e validação pré-seed.
 */
export function normalizeFitoterapicosSeed(
  input: FitoterapicosSeedInput,
): MedicinaNaturalItemRecord[] {
  const buckets = new Map<string, MergeBucket>();

  for (const entry of input.mffb) {
    const key = mergeKeyNomeCientifico(entry.nomeCientifico);
    const bucket = buckets.get(key) ?? emptyBucket(entry.nomeCientifico, entry.nomePopular ?? entry.nomeCientifico);

    bucket.indicacoes = entry.indicacoes;
    bucket.contraindicacoes = entry.contraindicacoes;
    bucket.precaucoes = entry.precaucoes;
    bucket.interacoesMedicamentosas = entry.interacoesMedicamentosas ?? null;
    bucket.posologia = entry.posologia;
    bucket.viaAdministracao = entry.viaAdministracao;
    bucket.alertaGestacaoPediatria = entry.alertaGestacaoPediatria ?? null;
    bucket.statusRegulatorio = inferMffbStatus(entry);
    bucket.renisus = entry.renisus;
    bucket.nomesAlternativos = [
      ...new Set([...bucket.nomesAlternativos, ...entry.nomesAlternativos]),
    ];
    if (entry.parteUtilizada) bucket.detalhes.parteUtilizada = entry.parteUtilizada;
    if (entry.efeitosAdversos) bucket.detalhes.efeitosAdversos = entry.efeitosAdversos;

    bucket.fontes = mergeFontes(bucket.fontes, {
      ...MFFB_FONTE,
      campos: [
        "indicacoes",
        "contraindicacoes",
        "precaucoes",
        "interacoesMedicamentosas",
        "posologia",
        "viaAdministracao",
        ...(entry.efeitosAdversos ? ["efeitosAdversos"] : []),
      ],
    });

    buckets.set(key, bucket);
  }

  for (const entry of input.fffb) {
    const key = mergeKeyNomeCientifico(entry.nomeCientifico);
    const bucket = buckets.get(key) ?? emptyBucket(entry.nomeCientifico, entry.nomePopular ?? entry.nomeCientifico);

    if (!bucket.indicacoes) bucket.indicacoes = entry.indicacoes;
    if (entry.advertencias) {
      bucket.precaucoes = bucket.precaucoes
        ? `${bucket.precaucoes}\n\n[FFFB] ${entry.advertencias}`
        : entry.advertencias;
    }
    bucket.detalhes.modoPreparo = entry.modoPreparo;
    if (entry.formaFarmaceutica) {
      bucket.detalhes.formaFarmaceutica = [
        ...(bucket.detalhes.formaFarmaceutica ?? []),
        entry.formaFarmaceutica,
      ];
    }
    bucket.nomesAlternativos = [
      ...new Set([...bucket.nomesAlternativos, ...entry.nomesAlternativos]),
    ];

    bucket.fontes = mergeFontes(bucket.fontes, {
      ...FFFB_FONTE,
      campos: ["modoPreparo", "indicacoes", "advertencias"],
    });

    if (bucket.statusRegulatorio !== "MEDICAMENTO_REGISTRADO") {
      bucket.statusRegulatorio = "PRODUTO_TRADICIONAL_NOTIFICADO";
    }

    buckets.set(key, bucket);
  }

  return [...buckets.values()].map((b) => ({
    slug: slugFromNomeCientifico(b.nomeCientifico),
    nome: b.nome,
    nomesAlternativos: b.nomesAlternativos,
    nomeCientifico: b.nomeCientifico,
    categoriaPratica: "FITOTERAPICO" as const,
    indicacoes: b.indicacoes,
    contraindicacoes: b.contraindicacoes,
    precaucoes: b.precaucoes,
    interacoesMedicamentosas: b.interacoesMedicamentosas,
    posologia: b.posologia,
    viaAdministracao: b.viaAdministracao,
    statusRegulatorio: b.statusRegulatorio,
    fontes: b.fontes,
    alertaGestacaoPediatria: b.alertaGestacaoPediatria,
    renisus: b.renisus,
    detalhesEspecificos: b.detalhes,
    searchText: buildSearchText(b.nome, b.nomeCientifico, b.nomesAlternativos),
  }));
}

export function loadFitoterapicosFile(
  filePath?: string,
): { records: MedicinaNaturalItemRecord[]; summary: string } {
  const resolved = filePath
    ? path.resolve(filePath)
    : path.join(process.cwd(), "data", "fitoterapicos", "seed.json");

  if (!fs.existsSync(resolved)) {
    console.log(`[fitoterapicos] Sem arquivo em ${resolved} — usando input vazio.`);
    return { records: [], summary: "0 itens (arquivo ausente)" };
  }

  const raw = JSON.parse(fs.readFileSync(resolved, "utf8"));

  if (isFitoterapicosLoteInput(raw)) {
    const parsed = FitoterapicosLoteInputSchema.parse(raw);
    const records = parsed.itens.map(normalizeFitoterapicoLoteItem);
    const lote = parsed._meta?.lote;
    return {
      records,
      summary: `${records.length} itens (lote${lote ? ` ${lote}` : ""})`,
    };
  }

  const parsed = FitoterapicosSeedInputSchema.parse(raw);
  const records = normalizeFitoterapicosSeed(parsed);
  return {
    records,
    summary: `${parsed.mffb.length} MFFB + ${parsed.fffb.length} FFFB → ${records.length} itens`,
  };
}

/** @deprecated use loadFitoterapicosFile */
export function loadFitoterapicosInput(filePath?: string): FitoterapicosSeedInput {
  const resolved = filePath
    ? path.resolve(filePath)
    : path.join(process.cwd(), "data", "fitoterapicos", "seed.json");

  if (!fs.existsSync(resolved)) {
    return FitoterapicosSeedInputSchema.parse({ mffb: [], fffb: [] });
  }

  const raw = JSON.parse(fs.readFileSync(resolved, "utf8"));
  if (isFitoterapicosLoteInput(raw)) {
    return FitoterapicosSeedInputSchema.parse({ mffb: [], fffb: [] });
  }
  return FitoterapicosSeedInputSchema.parse(raw);
}

export async function seedFitoterapicos(
  db: PrismaClient,
  options?: {
    filePath?: string;
    records?: MedicinaNaturalItemRecord[];
  },
): Promise<void> {
  const loaded = options?.records
    ? { records: options.records, summary: `${options.records.length} itens (inline)` }
    : loadFitoterapicosFile(options?.filePath);

  console.log(`[fitoterapicos] ${loaded.summary}`);

  if (loaded.records.length === 0) {
    console.log("[fitoterapicos] Nada a inserir.");
    return;
  }

  const stats = await upsertMedicinaNaturalItems(db, loaded.records, "nomeCientifico");
  console.log("[fitoterapicos] Upsert:", stats);
}

async function main() {
  const fileArg = process.argv[2];
  const db = new PrismaClient();

  try {
    await seedFitoterapicos(db, { filePath: fileArg });
  } finally {
    await db.$disconnect();
  }
}

if (require.main === module) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
