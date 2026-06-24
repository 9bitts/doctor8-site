import type { MetadataRoute } from "next";
import { db } from "@/lib/db";
import { APP_BASE_URL, buildPublicProfilePath } from "@/lib/public-profile";

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
