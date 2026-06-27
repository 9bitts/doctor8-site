import { db } from "@/lib/db";
import {
  DEFAULT_VENEZUELA_POOLS,
  VENEZUELA_CAMPAIGN_SLUG,
} from "@/lib/humanitarian/constants";

export async function seedVenezuelaCampaign() {
  const existing = await db.humanitarianCampaign.findUnique({
    where: { slug: VENEZUELA_CAMPAIGN_SLUG },
    include: { pools: true },
  });

  const campaignData = {
    name: "SOS Venezuela",
    description: "Atención médica y de salud mental gratuita para personas afectadas por el terremoto. Sin costo. Voluntarios de Doctor8.",
    region: "VE" as const,
    active: true,
    endAt: null as Date | null,
  };

  if (existing) {
    await db.humanitarianCampaign.update({
      where: { id: existing.id },
      data: campaignData,
    });

    for (const p of DEFAULT_VENEZUELA_POOLS) {
      await db.humanitarianPool.upsert({
        where: {
          campaignId_slug: {
            campaignId: existing.id,
            slug: p.slug,
          },
        },
        create: {
          campaignId: existing.id,
          slug: p.slug,
          labelEs: p.labelEs,
          labelPt: p.labelPt,
          labelEn: p.labelEn,
          maxWaiting: p.maxWaiting,
          sortOrder: p.sortOrder,
        },
        update: {
          labelEs: p.labelEs,
          labelPt: p.labelPt,
          labelEn: p.labelEn,
          maxWaiting: p.maxWaiting,
          sortOrder: p.sortOrder,
        },
      });
    }

    return db.humanitarianCampaign.findUnique({
      where: { id: existing.id },
      include: { pools: { orderBy: { sortOrder: "asc" } } },
    });
  }

  return db.humanitarianCampaign.create({
    data: {
      slug: VENEZUELA_CAMPAIGN_SLUG,
      ...campaignData,
      noShowTimeoutSeconds: 180,
      estimatedMinutesPerPatient: 15,
      pools: {
        create: DEFAULT_VENEZUELA_POOLS.map((p) => ({
          slug: p.slug,
          labelEs: p.labelEs,
          labelPt: p.labelPt,
          labelEn: p.labelEn,
          maxWaiting: p.maxWaiting,
          sortOrder: p.sortOrder,
        })),
      },
    },
    include: { pools: { orderBy: { sortOrder: "asc" } } },
  });
}
