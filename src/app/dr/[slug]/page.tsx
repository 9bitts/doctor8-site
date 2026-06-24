// Short link redirect — /dr/[slug] → canonical SEO URL

import { redirect, notFound } from "next/navigation";
import { db } from "@/lib/db";
import { buildPublicProfilePath } from "@/lib/public-profile";

export default async function DrShortLinkPage({
  params,
}: {
  params: { slug: string };
}) {
  const card = await db.virtualCard.findUnique({
    where: { slug: params.slug },
    include: {
      professional: { select: { verified: true } },
      psychoanalyst: { select: { verified: true } },
    },
  });

  if (!card) notFound();

  const profile = card.professional ?? card.psychoanalyst;
  if (!card.isPublic || !profile?.verified) notFound();

  redirect(buildPublicProfilePath(card));
}
