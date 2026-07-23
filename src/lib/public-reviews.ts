// Public reviews for live provider profiles (anonymized patient names).

import { db } from "@/lib/db";
import type { ProviderType } from "@/lib/providers";

export type PublicReviewDto = {
  id: string;
  rating: number;
  comment: string | null;
  patientLabel: string;
  createdAt: string;
};

function patientLabel(firstName: string, lastName: string): string {
  const f = firstName.trim();
  const initial = lastName.trim()[0];
  return initial ? `${f} ${initial}.` : f || "Paciente";
}

async function labelsForPatientUserIds(userIds: string[]): Promise<Map<string, string>> {
  const patientUsers = await db.user.findMany({
    where: { id: { in: userIds } },
    include: { patientProfile: { select: { firstName: true, lastName: true } } },
  });
  return new Map(
    patientUsers.map((u) => [
      u.id,
      u.patientProfile
        ? patientLabel(u.patientProfile.firstName, u.patientProfile.lastName)
        : "Paciente",
    ]),
  );
}

export async function getPublicReviewsForSlug(slug: string): Promise<{
  reviews: PublicReviewDto[];
  avg: number | null;
  count: number;
} | null> {
  const card = await db.virtualCard.findUnique({
    where: { slug, isPublic: true },
    select: {
      professionalId: true,
      psychoanalystId: true,
      integrativeTherapistId: true,
    },
  });
  if (!card) return null;

  const providerType: ProviderType = card.professionalId
    ? "health"
    : card.psychoanalystId
      ? "psychoanalyst"
      : "integrative";
  const providerId =
    card.professionalId ?? card.psychoanalystId ?? card.integrativeTherapistId;
  if (!providerId) return null;

  return getPublicReviews(providerId, providerType);
}

export async function getPublicReviews(
  providerId: string,
  providerType: ProviderType,
  limit = 20
): Promise<{ reviews: PublicReviewDto[]; avg: number | null; count: number }> {
  if (providerType === "psychoanalyst") {
    const rows = await db.psychoanalystReview.findMany({
      where: { psychoanalystId: providerId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    const patientMap = await labelsForPatientUserIds(rows.map((r) => r.patientUserId));
    const agg = await db.psychoanalystReview.aggregate({
      where: { psychoanalystId: providerId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      reviews: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        patientLabel: patientMap.get(r.patientUserId) ?? "Paciente",
        createdAt: r.createdAt.toISOString(),
      })),
      avg: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
      count: agg._count.rating,
    };
  }

  if (providerType === "integrative") {
    const rows = await db.integrativeTherapistReview.findMany({
      where: { integrativeTherapistId: providerId },
      orderBy: { createdAt: "desc" },
      take: limit,
    });
    const patientMap = await labelsForPatientUserIds(rows.map((r) => r.patientUserId));
    const agg = await db.integrativeTherapistReview.aggregate({
      where: { integrativeTherapistId: providerId },
      _avg: { rating: true },
      _count: { rating: true },
    });

    return {
      reviews: rows.map((r) => ({
        id: r.id,
        rating: r.rating,
        comment: r.comment,
        patientLabel: patientMap.get(r.patientUserId) ?? "Paciente",
        createdAt: r.createdAt.toISOString(),
      })),
      avg: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
      count: agg._count.rating,
    };
  }

  const rows = await db.professionalReview.findMany({
    where: { professionalId: providerId },
    orderBy: { createdAt: "desc" },
    take: limit,
    include: {
      patientUser: {
        include: { patientProfile: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  const agg = await db.professionalReview.aggregate({
    where: { professionalId: providerId },
    _avg: { rating: true },
    _count: { rating: true },
  });

  return {
    reviews: rows.map((r) => ({
      id: r.id,
      rating: r.rating,
      comment: r.comment,
      patientLabel: r.patientUser.patientProfile
        ? patientLabel(
            r.patientUser.patientProfile.firstName,
            r.patientUser.patientProfile.lastName
          )
        : "Paciente",
      createdAt: r.createdAt.toISOString(),
    })),
    avg: agg._avg.rating ? Math.round(agg._avg.rating * 10) / 10 : null,
    count: agg._count.rating,
  };
}
