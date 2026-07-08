import { db } from "@/lib/db";

/** Public audio paths for psychoed trails (hosted on Doctor8 CDN / public folder). */
export const DEFAULT_CONTENT_AUDIO: Record<string, { publicUrl: string; durationSecs: number; transcript: string }> = {
  "trail-apoio-1": {
    publicUrl: "/audio/employer/trail-apoio-1.mp3",
    durationSecs: 420,
    transcript:
      "Nesta trilha você aprenderá como pedir ajuda no ambiente de trabalho sem medo de julgamento, fortalecendo redes de apoio com colegas e liderança.",
  },
  "trail-ansiedade-1": {
    publicUrl: "/audio/employer/trail-ansiedade-1.mp3",
    durationSecs: 240,
    transcript:
      "Exercício guiado de respiração 4-7-8: inspire por 4 segundos, segure por 7, expire por 8. Repita três ciclos.",
  },
};

export async function ensureContentAssets(): Promise<void> {
  for (const [contentId, asset] of Object.entries(DEFAULT_CONTENT_AUDIO)) {
    await db.employerContentAsset.upsert({
      where: { contentId },
      create: {
        contentId,
        format: "audio",
        publicUrl: asset.publicUrl,
        durationSecs: asset.durationSecs,
        transcript: asset.transcript,
      },
      update: {
        publicUrl: asset.publicUrl,
        durationSecs: asset.durationSecs,
        transcript: asset.transcript,
      },
    });
  }
}

export async function getContentAsset(contentId: string) {
  await ensureContentAssets();
  return db.employerContentAsset.findUnique({ where: { contentId } });
}

export async function listContentAssets() {
  await ensureContentAssets();
  return db.employerContentAsset.findMany({ orderBy: { contentId: "asc" } });
}
