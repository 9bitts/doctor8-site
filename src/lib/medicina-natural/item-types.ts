import { z } from "zod";

/** Espelha CategoriaPraticaMedicinaNatural do Prisma (proposta). */
export const CATEGORIA_PRATICA = [
  "FITOTERAPICO",
  "FLORAL",
  "AROMATERAPIA",
  "HOMEOPATIA",
  "APITERAPIA",
] as const;

export type CategoriaPratica = (typeof CATEGORIA_PRATICA)[number];

export const STATUS_REGULATORIO = [
  "MEDICAMENTO_REGISTRADO",
  "PRODUTO_TRADICIONAL_NOTIFICADO",
  "USO_TRADICIONAL_SEM_REGISTRO",
  "PRATICA_INTEGRATIVA_NAO_REGULADA",
] as const;

export type StatusRegulatorio = (typeof STATUS_REGULATORIO)[number];

export interface FonteReferencia {
  fonte: string;
  edicao: string;
  url?: string;
  dataConsulta?: string;
  campos?: string[];
}

/** @deprecated use FonteReferencia */
export type ProvenienciaEntry = FonteReferencia;

/** Fitoterápicos — planta in natura, tintura, industrializado, chá etc. */
export interface DetalhesFitoterapico {
  formaFarmaceutica?: (
    | "planta_in_natura"
    | "tintura"
    | "industrializado"
    | "cha"
    | "decoção"
    | "capsula"
    | "comprimido"
  )[];
  modoPreparo?: string;
  efeitosAdversos?: string;
  parteUtilizada?: string;
}

/** Florais — Bach, Saint Germain etc. */
export interface DetalhesFloral {
  sistema?: "bach" | "bach_rescue" | "saint_germain" | "saint_germain_formula";
  grupoEmocional?: string;
  estadoNegativo?: string;
  estadoPositivo?: string;
}

/** Aromaterapia */
export interface DetalhesAromaterapia {
  diluicaoRecomendada?: string;
  viaUso?: ("topica" | "inalacao" | "difusao" | "interna")[];
  fototoxicidade?: boolean;
  alertaUsoInterno?: string;
}

/** Homeopatia — RDC 721/2022, Farmacopeia Homeopática Brasileira */
export interface DetalhesHomeopatia {
  potencia?: string;
  dinamizacao?: string;
  baseRegulatoria?: string;
  farmacopeiaLink?: string;
}

/** Apiterapia */
export type ProdutoOrigemApiterapia =
  | "mel"
  | "propolis"
  | "geleia_real"
  | "polen"
  | "veneno_abelha";

export interface DetalhesApiterapia {
  produtoOrigem?: ProdutoOrigemApiterapia;
  alertaAlergiaAnafilaxia?: string;
}

export type DetalhesEspecificos =
  | DetalhesFitoterapico
  | DetalhesFloral
  | DetalhesAromaterapia
  | DetalhesHomeopatia
  | DetalhesApiterapia;

/** Registro normalizado produzido pelos seeds — independente do Prisma. */
export interface MedicinaNaturalItemRecord {
  slug: string;
  nome: string;
  nomesAlternativos: string[];
  nomeCientifico: string | null;
  categoriaPratica: CategoriaPratica;
  indicacoes: string;
  contraindicacoes: string;
  precaucoes: string;
  interacoesMedicamentosas: string | null;
  posologia: string;
  viaAdministracao: string[];
  statusRegulatorio: StatusRegulatorio;
  fontes: FonteReferencia[];
  alertaGestacaoPediatria: string | null;
  renisus: boolean;
  detalhesEspecificos: DetalhesEspecificos;
  searchText: string;
}

// ─── Zod: input dos seeds de fitoterápicos (MFFB + FFFB) ───────────────────

export const MffbMonografiaInputSchema = z.object({
  nomeCientifico: z.string().min(1),
  nomePopular: z.string().optional(),
  nomesAlternativos: z.array(z.string()).default([]),
  indicacoes: z.string().min(1),
  contraindicacoes: z.string().default(""),
  precaucoes: z.string().default(""),
  efeitosAdversos: z.string().optional(),
  interacoesMedicamentosas: z.string().optional(),
  viaAdministracao: z.array(z.string()).default([]),
  posologia: z.string().min(1),
  alertaGestacaoPediatria: z.string().optional(),
  renisus: z.boolean().default(false),
  /** Quando omitido, inferido: MEDICAMENTO_REGISTRADO se renisus, senão PRODUTO_TRADICIONAL_NOTIFICADO */
  statusRegulatorio: z.enum(STATUS_REGULATORIO).optional(),
  parteUtilizada: z.string().optional(),
});

export type MffbMonografiaInput = z.infer<typeof MffbMonografiaInputSchema>;

export const FffbMonografiaInputSchema = z.object({
  nomeCientifico: z.string().min(1),
  nomePopular: z.string().optional(),
  nomesAlternativos: z.array(z.string()).default([]),
  modoPreparo: z.string().min(1),
  indicacoes: z.string().min(1),
  /** Advertências do FFFB — mapeadas para precauções + contraindicações no merge */
  advertencias: z.string().default(""),
  formaFarmaceutica: z
    .enum([
      "planta_in_natura",
      "tintura",
      "industrializado",
      "cha",
      "decoção",
      "capsula",
      "comprimido",
    ])
    .optional(),
});

export type FffbMonografiaInput = z.infer<typeof FffbMonografiaInputSchema>;

export const FitoterapicosSeedInputSchema = z.object({
  mffb: z.array(MffbMonografiaInputSchema).default([]),
  fffb: z.array(FffbMonografiaInputSchema).default([]),
});

export type FitoterapicosSeedInput = z.infer<typeof FitoterapicosSeedInputSchema>;

// ─── Zod: lote MFFB/FFFB com itens prontos para MedicinaNaturalItem ────────

export const FitoterapicoFonteSchema = z.object({
  fonte: z.string().min(1),
  edicao: z.string().min(1),
  url: z.string().url().optional(),
  dataConsulta: z.string().optional(),
  campos: z.array(z.string()).optional(),
});

export const FitoterapicoLoteItemSchema = z.object({
  slug: z.string().min(1),
  nome: z.string().min(1),
  nomesAlternativos: z.array(z.string()).default([]),
  nomeCientifico: z.string().min(1),
  categoriaPratica: z.literal("FITOTERAPICO").default("FITOTERAPICO"),
  indicacoes: z.string().min(1),
  contraindicacoes: z.string().default(""),
  precaucoes: z.string().default(""),
  interacoesMedicamentosas: z.string().nullable().optional(),
  posologia: z.string().min(1),
  viaAdministracao: z.array(z.string()).default([]),
  statusRegulatorio: z.enum(STATUS_REGULATORIO),
  fontes: z.array(FitoterapicoFonteSchema).min(1),
  alertaGestacaoPediatria: z.string().nullable().optional(),
  renisus: z.boolean().default(false),
  detalhesEspecificos: z.record(z.unknown()).default({}),
  searchText: z.string().optional(),
});

export const FitoterapicosLoteInputSchema = z.object({
  _meta: z.record(z.unknown()).optional(),
  itens: z.array(FitoterapicoLoteItemSchema).min(1),
});

export type FitoterapicosLoteInput = z.infer<typeof FitoterapicosLoteInputSchema>;
export type FitoterapicoLoteItem = z.infer<typeof FitoterapicoLoteItemSchema>;

export type FitoterapicosAnyInput =
  | FitoterapicosSeedInput
  | FitoterapicosLoteInput;

export function isFitoterapicosLoteInput(
  raw: unknown,
): raw is FitoterapicosLoteInput {
  return (
    typeof raw === "object" &&
    raw !== null &&
    "itens" in raw &&
    Array.isArray((raw as FitoterapicosLoteInput).itens)
  );
}

export function normalizeFitoterapicoLoteItem(
  item: FitoterapicoLoteItem,
): MedicinaNaturalItemRecord {
  return {
    slug: item.slug,
    nome: item.nome,
    nomesAlternativos: item.nomesAlternativos,
    nomeCientifico: item.nomeCientifico,
    categoriaPratica: "FITOTERAPICO",
    indicacoes: item.indicacoes,
    contraindicacoes: item.contraindicacoes,
    precaucoes: item.precaucoes,
    interacoesMedicamentosas: item.interacoesMedicamentosas ?? null,
    posologia: item.posologia,
    viaAdministracao: item.viaAdministracao,
    statusRegulatorio: item.statusRegulatorio,
    fontes: item.fontes,
    alertaGestacaoPediatria: item.alertaGestacaoPediatria ?? null,
    renisus: item.renisus,
    detalhesEspecificos: item.detalhesEspecificos,
    searchText:
      item.searchText?.trim() ||
      [item.nome, item.nomeCientifico, ...item.nomesAlternativos]
        .join(" ")
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, ""),
  };
}

// ─── Zod: stubs para as outras práticas (popular depois) ───────────────────

export const FloralMonografiaInputSchema = z.object({
  slug: z.string().min(1),
  nome: z.string().min(1),
  nomesAlternativos: z.array(z.string()).default([]),
  indicacoes: z.string().min(1),
  contraindicacoes: z.string().default(""),
  precaucoes: z.string().default(""),
  posologia: z.string().default("4 gotas, 4x/dia"),
  detalhes: z
    .object({
      sistema: z.enum([
        "bach",
        "bach_rescue",
        "saint_germain",
        "saint_germain_formula",
      ]),
      grupoEmocional: z.string().optional(),
      estadoNegativo: z.string().optional(),
      estadoPositivo: z.string().optional(),
    })
    .optional(),
});

export const AromaterapiaMonografiaInputSchema = z.object({
  slug: z.string().min(1),
  nome: z.string().min(1),
  nomesAlternativos: z.array(z.string()).default([]),
  indicacoes: z.string().min(1),
  contraindicacoes: z.string().default(""),
  precaucoes: z.string().default(""),
  posologia: z.string().default(""),
  diluicaoRecomendada: z.string().optional(),
  viaUso: z
    .array(z.enum(["topica", "inalacao", "difusao", "interna"]))
    .default(["topica", "inalacao"]),
  fototoxicidade: z.boolean().default(false),
});

export const HomeopatiaMonografiaInputSchema = z.object({
  slug: z.string().min(1),
  nome: z.string().min(1),
  nomesAlternativos: z.array(z.string()).default([]),
  indicacoes: z.string().min(1),
  contraindicacoes: z.string().default(""),
  precaucoes: z.string().default(""),
  posologia: z.string().default(""),
  potencia: z.string().optional(),
  dinamizacao: z.string().optional(),
});

export const ApiterapiaMonografiaInputSchema = z.object({
  slug: z.string().min(1),
  nome: z.string().min(1),
  nomesAlternativos: z.array(z.string()).default([]),
  indicacoes: z.string().min(1),
  contraindicacoes: z.string().default(""),
  precaucoes: z.string().default(""),
  posologia: z.string().default(""),
  produtoOrigem: z.enum([
    "mel",
    "propolis",
    "geleia_real",
    "polen",
    "veneno_abelha",
  ]),
  alertaAlergiaAnafilaxia: z
    .string()
    .default(
      "Risco de reação alérgica grave, incluindo anafilaxia. Contraindicado em pacientes com alergia conhecida a produtos apícolas.",
    ),
});
