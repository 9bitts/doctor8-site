import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import {
  APP_BASE_URL,
  buildPublicProfilePath,
  buildPublicSearchPath,
  buildPublicSearchConvenioPath,
} from "@/lib/public-slugs";
import {
  SITEMAP_SPECIALTY_CITY_COMBOS,
  SITEMAP_CONVENIO_SLUGS,
} from "@/lib/seo-index";

export const dynamic = "force-dynamic";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const cards = await db.virtualCard.findMany({
    where: { isPublic: true },
    include: {
      professional: { select: { verified: true, updatedAt: true } },
      psychoanalyst: { select: { verified: true, updatedAt: true } },
    },
  });

  const entries: MetadataRoute.Sitemap = [
    {
      url: APP_BASE_URL,
      lastModified: new Date(),
      changeFrequency: "weekly",
      priority: 1,
    },
  ];

  for (const combo of SITEMAP_SPECIALTY_CITY_COMBOS) {
    entries.push({
      url: `${APP_BASE_URL}${buildPublicSearchPath(combo.especialidade, combo.cidade)}`,
      lastModified: new Date(),
      changeFrequency: "daily",
      priority: 0.7,
    });
    for (const convenio of SITEMAP_CONVENIO_SLUGS) {
      entries.push({
        url: `${APP_BASE_URL}${buildPublicSearchConvenioPath(
          combo.especialidade,
          combo.cidade,
          convenio
        )}`,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 0.6,
      });
    }
  }

  for (const card of cards) {
    const profile = card.professional ?? card.psychoanalyst;
    if (!profile?.verified) continue;

    entries.push({
      url: `${APP_BASE_URL}${buildPublicProfilePath(card)}`,
      lastModified: profile.updatedAt,
      changeFrequency: "weekly",
      priority: 0.8,
    });
  }

  return entries;
}
