/**
 * Utilitários compartilhados pelos seeds de Medicina Natural.
 */

import {
  Prisma,
  type PrismaClient,
} from "@prisma/client";
import type { MedicinaNaturalItemRecord } from "@/lib/medicina-natural/item-types";

export function recordToDbRow(
  record: MedicinaNaturalItemRecord,
): Prisma.MedicinaNaturalItemCreateInput {
  return {
    slug: record.slug,
    nome: record.nome,
    nomesAlternativos: record.nomesAlternativos,
    nomeCientifico: record.nomeCientifico,
    categoriaPratica: record.categoriaPratica,
    indicacoes: record.indicacoes,
    contraindicacoes: record.contraindicacoes,
    precaucoes: record.precaucoes,
    interacoesMedicamentosas: record.interacoesMedicamentosas,
    posologia: record.posologia,
    viaAdministracao: record.viaAdministracao,
    statusRegulatorio: record.statusRegulatorio,
    fontes: record.fontes as unknown as Prisma.InputJsonValue,
    alertaGestacaoPediatria: record.alertaGestacaoPediatria,
    renisus: record.renisus,
    detalhesEspecificos: record.detalhesEspecificos as unknown as Prisma.InputJsonValue,
    searchText: record.searchText,
  };
}

export interface UpsertMedicinaNaturalStats {
  read: number;
  inserted: number;
  updated: number;
  skipped: number;
}

export async function upsertMedicinaNaturalItems(
  db: PrismaClient,
  records: MedicinaNaturalItemRecord[],
  key: "nomeCientifico" | "slug",
): Promise<UpsertMedicinaNaturalStats> {
  const stats: UpsertMedicinaNaturalStats = {
    read: records.length,
    inserted: 0,
    updated: 0,
    skipped: 0,
  };

  for (const record of records) {
    const whereValue =
      key === "nomeCientifico" ? record.nomeCientifico : record.slug;

    if (!whereValue) {
      stats.skipped++;
      continue;
    }

    const data = recordToDbRow(record);
    const where =
      key === "nomeCientifico"
        ? { nomeCientifico: whereValue }
        : { slug: whereValue };

    const existing = await db.medicinaNaturalItem.findUnique({ where });

    if (existing) {
      await db.medicinaNaturalItem.update({ where: { id: existing.id }, data });
      stats.updated++;
    } else {
      await db.medicinaNaturalItem.create({ data });
      stats.inserted++;
    }
  }

  return stats;
}

/** Constantes de fonte — edições oficiais. */
export const FONTE_MFFB = "MFFB";
export const EDICAO_MFFB = "MFFB 1ª ed. 2016";
export const FONTE_FFFB = "FFFB";
export const EDICAO_FFFB = "FFFB 2ª ed.";
export const FONTE_FHB = "FHB";
export const EDICAO_FHB = "Farmacopeia Homeopática Brasileira 3ª ed.";
