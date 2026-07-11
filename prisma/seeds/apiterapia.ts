/**
 * Seed de Apiterapia — estrutura vazia.
 * Alerta obrigatório de alergia/anafilaxia em todo item.
 *
 * Uso: npx tsx prisma/seeds/apiterapia.ts
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import {
  ApiterapiaMonografiaInputSchema,
  type MedicinaNaturalItemRecord,
} from "@/lib/medicina-natural/item-types";
import { normalizeSearchText } from "@/lib/medicina-natural/search-text";
import { upsertMedicinaNaturalItems } from "./medicina-natural-shared";

const InputSchema = ApiterapiaMonografiaInputSchema.array();

function normalize(entries: ReturnType<typeof InputSchema.parse>): MedicinaNaturalItemRecord[] {
  return entries.map((e) => ({
    slug: e.slug,
    nome: e.nome,
    nomesAlternativos: e.nomesAlternativos,
    nomeCientifico: null,
    categoriaPratica: "APITERAPIA",
    indicacoes: e.indicacoes,
    contraindicacoes: `ALERGIA A PRODUTOS APÍCOLAS: contraindicado. ${e.contraindicacoes}`.trim(),
    precaucoes: e.precaucoes,
    interacoesMedicamentosas: null,
    posologia: e.posologia,
    viaAdministracao: ["oral", "topica"],
    statusRegulatorio: "USO_TRADICIONAL_SEM_REGISTRO",
    fontes: [],
    alertaGestacaoPediatria: null,
    renisus: false,
    detalhesEspecificos: {
      produtoOrigem: e.produtoOrigem,
      alertaAlergiaAnafilaxia: e.alertaAlergiaAnafilaxia,
    },
    searchText: normalizeSearchText([e.nome, ...e.nomesAlternativos, e.produtoOrigem]),
  }));
}

export async function seedApiterapia(db: PrismaClient): Promise<void> {
  const file = path.join(process.cwd(), "data", "apiterapia", "seed.json");
  if (!fs.existsSync(file)) {
    console.log("[apiterapia] Aguardando data/apiterapia/seed.json");
    return;
  }
  const entries = InputSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
  const stats = await upsertMedicinaNaturalItems(db, normalize(entries), "slug");
  console.log("[apiterapia] Upsert:", stats);
}

if (require.main === module) {
  const db = new PrismaClient();
  seedApiterapia(db)
    .finally(() => db.$disconnect())
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
