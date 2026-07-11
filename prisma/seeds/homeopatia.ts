/**
 * Seed de Homeopatia — estrutura vazia.
 * Base regulatória: RDC 721/2022 + Farmacopeia Homeopática Brasileira.
 *
 * Uso: npx tsx prisma/seeds/homeopatia.ts
 */

import * as fs from "fs";
import * as path from "path";
import { PrismaClient } from "@prisma/client";
import {
  HomeopatiaMonografiaInputSchema,
  type MedicinaNaturalItemRecord,
} from "@/lib/medicina-natural/item-types";
import { normalizeSearchText } from "@/lib/medicina-natural/search-text";
import {
  EDICAO_FHB,
  FONTE_FHB,
  upsertMedicinaNaturalItems,
} from "./medicina-natural-shared";

const InputSchema = HomeopatiaMonografiaInputSchema.array();

const FHB_LINK =
  "https://www.gov.br/anvisa/pt-br/assuntos/farmacopeia/farmacopeia-homeopatica-brasileira";

function normalize(entries: ReturnType<typeof InputSchema.parse>): MedicinaNaturalItemRecord[] {
  return entries.map((e) => ({
    slug: e.slug,
    nome: e.nome,
    nomesAlternativos: e.nomesAlternativos,
    nomeCientifico: null,
    categoriaPratica: "HOMEOPATIA",
    indicacoes: e.indicacoes,
    contraindicacoes: e.contraindicacoes,
    precaucoes: e.precaucoes,
    interacoesMedicamentosas: null,
    posologia: e.posologia,
    viaAdministracao: ["oral", "sublingual"],
    statusRegulatorio: "MEDICAMENTO_REGISTRADO",
    fontes: [
      { fonte: FONTE_FHB, edicao: EDICAO_FHB, campos: ["indicacoes", "contraindicacoes", "posologia"] },
      { fonte: "RDC 721/2022", edicao: "2022" },
    ],
    alertaGestacaoPediatria: null,
    renisus: false,
    detalhesEspecificos: {
      potencia: e.potencia,
      dinamizacao: e.dinamizacao,
      baseRegulatoria: "RDC ANVISA nº 721/2022",
      farmacopeiaLink: FHB_LINK,
    },
    searchText: normalizeSearchText([e.nome, ...e.nomesAlternativos, e.potencia]),
  }));
}

export async function seedHomeopatia(db: PrismaClient): Promise<void> {
  const file = path.join(process.cwd(), "data", "homeopatia", "seed.json");
  if (!fs.existsSync(file)) {
    console.log("[homeopatia] Aguardando data/homeopatia/seed.json");
    return;
  }
  const entries = InputSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
  const stats = await upsertMedicinaNaturalItems(db, normalize(entries), "slug");
  console.log("[homeopatia] Upsert:", stats);
}

if (require.main === module) {
  const db = new PrismaClient();
  seedHomeopatia(db)
    .finally(() => db.$disconnect())
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}
