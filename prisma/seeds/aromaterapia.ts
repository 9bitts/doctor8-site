/**
 * Seed de Aromaterapia — estrutura vazia.
 * Uso: npx tsx prisma/seeds/aromaterapia.ts
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import {
  AromaterapiaMonografiaInputSchema,
  type MedicinaNaturalItemRecord,
} from "@/lib/medicina-natural/item-types";
import { normalizeSearchText } from "@/lib/medicina-natural/search-text";
import { upsertMedicinaNaturalItems } from "./medicina-natural-shared";

const InputSchema = AromaterapiaMonografiaInputSchema.array();

function normalize(entries: ReturnType<typeof InputSchema.parse>): MedicinaNaturalItemRecord[] {
  return entries.map((e) => {
    const alertaUsoInterno =
      e.viaUso.includes("interna")
        ? "Uso interno de óleos essenciais desencorajado salvo indicação expressa e supervisão profissional."
        : "Uso interno de óleos essenciais não recomendado por padrão.";
    const fototox =
      e.fototoxicidade
        ? "Óleo com potencial fototóxico — evitar exposição solar após aplicação tópica."
        : null;

    return {
      slug: e.slug,
      nome: e.nome,
      nomesAlternativos: e.nomesAlternativos,
      nomeCientifico: null,
      categoriaPratica: "AROMATERAPIA",
      indicacoes: e.indicacoes,
      contraindicacoes: e.contraindicacoes,
      precaucoes: [e.precaucoes, fototox].filter(Boolean).join("\n\n"),
      interacoesMedicamentosas: null,
      posologia: e.posologia,
      viaAdministracao: e.viaUso,
      statusRegulatorio: "USO_TRADICIONAL_SEM_REGISTRO",
      fontes: [],
      alertaGestacaoPediatria: null,
      renisus: false,
      detalhesEspecificos: {
        diluicaoRecomendada: e.diluicaoRecomendada,
        viaUso: e.viaUso,
        fototoxicidade: e.fototoxicidade,
        alertaUsoInterno,
      },
      searchText: normalizeSearchText([e.nome, ...e.nomesAlternativos]),
    };
  });
}

export async function seedAromaterapia(db: PrismaClient): Promise<void> {
  const file = path.join(process.cwd(), "data", "aromaterapia", "seed.json");
  if (!fs.existsSync(file)) {
    console.log("[aromaterapia] Aguardando data/aromaterapia/seed.json");
    return;
  }
  const entries = InputSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
  const stats = await upsertMedicinaNaturalItems(db, normalize(entries), "slug");
  console.log("[aromaterapia] Upsert:", stats);
}

if (require.main === module) {
  const db = new PrismaClient();
  seedAromaterapia(db)
    .finally(() => db.$disconnect())
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
