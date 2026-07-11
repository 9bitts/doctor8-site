/**
 * Seed de Florais — estrutura vazia.
 * Migrará dados de src/lib/florais-catalog/ + reference-library após schema confirmado.
 *
 * Uso: npx tsx prisma/seeds/florais.ts [caminho/para/dados.json]
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import {
  FloralMonografiaInputSchema,
  type MedicinaNaturalItemRecord,
} from "@/lib/medicina-natural/item-types";
import { normalizeSearchText } from "@/lib/medicina-natural/search-text";
import { upsertMedicinaNaturalItems } from "./medicina-natural-shared";

const FloralSeedInputSchema = FloralMonografiaInputSchema.array();

export function normalizeFloraisSeed(
  entries: ReturnType<typeof FloralSeedInputSchema.parse>,
): MedicinaNaturalItemRecord[] {
  return entries.map((e) => ({
    slug: e.slug,
    nome: e.nome,
    nomesAlternativos: e.nomesAlternativos,
    nomeCientifico: null,
    categoriaPratica: "FLORAL",
    indicacoes: e.indicacoes,
    contraindicacoes: e.contraindicacoes,
    precaucoes: e.precaucoes,
    interacoesMedicamentosas: null,
    posologia: e.posologia,
    viaAdministracao: ["oral"],
    statusRegulatorio: "PRATICA_INTEGRATIVA_NAO_REGULADA",
    fontes: [{ fonte: "Bach", edicao: "" }, { fonte: "Saint Germain", edicao: "" }],
    alertaGestacaoPediatria: null,
    renisus: false,
    detalhesEspecificos: e.detalhes ?? {},
    searchText: normalizeSearchText([e.nome, ...e.nomesAlternativos]),
  }));
}

export async function seedFlorais(db: PrismaClient): Promise<void> {
  const file = path.join(process.cwd(), "data", "florais", "seed.json");
  if (!fs.existsSync(file)) {
    console.log("[florais] Aguardando data/florais/seed.json");
    return;
  }
  const entries = FloralSeedInputSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
  const records = normalizeFloraisSeed(entries);
  const stats = await upsertMedicinaNaturalItems(db, records, "slug");
  console.log("[florais] Upsert:", stats);
}

if (require.main === module) {
  const db = new PrismaClient();
  seedFlorais(db)
    .finally(() => db.$disconnect())
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
