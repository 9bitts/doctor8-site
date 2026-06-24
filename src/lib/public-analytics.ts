// Public profile analytics ? views, book clicks, conversion.

import { db } from "@/lib/db";

export type PublicAnalyticsSource =
  | "public_profile"
  | "public_search"
  | "public_embed";

export type PublicProfileAnalytics = {
  views7d: number;
  views30d: number;
  bookClicks7d: number;
  bookClicks30d: number;
  bookings30d: number;
  conversionRate30d: number | null;
};

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
}

export async function recordPublicProfileEvent(
  slug: string,
  type: "VIEW" | "BOOK_CLICK",
  source?: PublicAnalyticsSource
): Promise<boolean> {
  const card = await db.virtualCard.findFirst({
    where: { slug, isPublic: true },
    select: { id: true },
  });
  if (!card) return false;

  await db.publicProfileEvent.create({
    data: {
      virtualCardId: card.id,
      type,
      source: source ?? null,
    },
  });
  return true;
}

export async function getPublicProfileAnalytics(
  virtualCardId: string,
  providerId: string,
  providerType: "health" | "psychoanalyst"
): Promise<PublicProfileAnalytics> {
  const since7 = daysAgo(7);
  const since30 = daysAgo(30);

  const [views7d, views30d, bookClicks7d, bookClicks30d] = await Promise.all([
    db.publicProfileEvent.count({
      where: { virtualCardId, type: "VIEW", createdAt: { gte: since7 } },
    }),
    db.publicProfileEvent.count({
      where: { virtualCardId, type: "VIEW", createdAt: { gte: since30 } },
    }),
    db.publicProfileEvent.count({
      where: { virtualCardId, type: "BOOK_CLICK", createdAt: { gte: since7 } },
    }),
    db.publicProfileEvent.count({
      where: { virtualCardId, type: "BOOK_CLICK", createdAt: { gte: since30 } },
    }),
  ]);

  const bookingWhere =
    providerType === "psychoanalyst"
      ? {
          psychoanalystId: providerId,
          bookingSource: { in: ["public_profile", "public_search", "public_embed"] },
          status: { not: "CANCELLED" as const },
          createdAt: { gte: since30 },
        }
      : {
          professionalId: providerId,
          bookingSource: { in: ["public_profile", "public_search", "public_embed"] },
          status: { not: "CANCELLED" as const },
          createdAt: { gte: since30 },
        };

  const bookings30d = await db.appointment.count({ where: bookingWhere });

  const conversionRate30d =
    views30d > 0 ? Math.round((bookings30d / views30d) * 1000) / 10 : null;

  return {
    views7d,
    views30d,
    bookClicks7d,
    bookClicks30d,
    bookings30d,
    conversionRate30d,
  };
}
