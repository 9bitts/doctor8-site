// Regional price benchmarks for professionals (market intelligence).

import { db } from "@/lib/db";
import { specialtyToSeoSlug, cityToSeoSlug } from "@/lib/public-slugs";

export type MarketPricingInsight = {
  specialty: string;
  specialtySlug: string;
  city: string | null;
  citySlug: string;
  yourPriceCents: number;
  currency: string;
  peerCount: number;
  minPriceCents: number;
  maxPriceCents: number;
  medianPriceCents: number;
  avgPriceCents: number;
  percentile: number | null;
};

function median(sorted: number[]): number {
  if (sorted.length === 0) return 0;
  const mid = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 0) {
    return Math.round((sorted[mid - 1] + sorted[mid]) / 2);
  }
  return sorted[mid];
}

function percentileRank(value: number, sorted: number[]): number | null {
  if (sorted.length === 0) return null;
  const below = sorted.filter((p) => p < value).length;
  return Math.round((below / sorted.length) * 100);
}

export async function getMarketPricingForProfessional(
  professionalId: string
): Promise<MarketPricingInsight | null> {
  const pro = await db.professionalProfile.findUnique({
    where: { id: professionalId },
    select: {
      id: true,
      specialty: true,
      clinicCity: true,
      consultPrice: true,
      currency: true,
    },
  });
  if (!pro) return null;

  const citySlug = cityToSeoSlug(pro.clinicCity);
  const specialtySlug = specialtyToSeoSlug(pro.specialty);

  const peers = await db.professionalProfile.findMany({
    where: {
      verified: true,
      specialty: pro.specialty,
      ...(pro.clinicCity
        ? { clinicCity: { equals: pro.clinicCity, mode: "insensitive" } }
        : {}),
      consultPrice: { gt: 0 },
    },
    select: { consultPrice: true },
  });

  const prices = peers.map((p) => p.consultPrice).sort((a, b) => a - b);
  const sum = prices.reduce((a, b) => a + b, 0);

  return {
    specialty: pro.specialty,
    specialtySlug,
    city: pro.clinicCity,
    citySlug,
    yourPriceCents: pro.consultPrice,
    currency: pro.currency || "BRL",
    peerCount: prices.length,
    minPriceCents: prices[0] ?? pro.consultPrice,
    maxPriceCents: prices[prices.length - 1] ?? pro.consultPrice,
    medianPriceCents: median(prices) || pro.consultPrice,
    avgPriceCents: prices.length ? Math.round(sum / prices.length) : pro.consultPrice,
    percentile: percentileRank(pro.consultPrice, prices),
  };
}
