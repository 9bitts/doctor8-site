import { NextRequest, NextResponse } from "next/server";
import { searchPublicListings, type PublicSearchSort } from "@/lib/public-search";
import { normalizeLang, localeOf } from "@/lib/i18n/translations";

export const dynamic = "force-dynamic";

const SORT_VALUES: PublicSearchSort[] = [
  "name",
  "rating",
  "reviews",
  "price_asc",
  "price_desc",
  "soonest",
];

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const especialidade = searchParams.get("especialidade")?.trim();
  const cidade = searchParams.get("cidade")?.trim();

  if (!especialidade || !cidade) {
    return NextResponse.json(
      { error: "especialidade and cidade are required" },
      { status: 400 }
    );
  }

  const lang = normalizeLang(searchParams.get("lang"));
  const locale = localeOf(lang);
  const convenio = searchParams.get("convenio") || null;
  const teleconsult = searchParams.get("teleconsult") === "1";
  const presencial = searchParams.get("presencial") === "1";

  const priceMaxRaw = searchParams.get("priceMax");
  const priceMax = priceMaxRaw ? Number(priceMaxRaw) : null;
  const minRatingRaw = searchParams.get("minRating");
  const minRating = minRatingRaw ? Number(minRatingRaw) : null;
  const availableOnly = searchParams.get("availableOnly") === "1";

  const sortParam = searchParams.get("sort") as PublicSearchSort | null;
  const sort = sortParam && SORT_VALUES.includes(sortParam) ? sortParam : "name";

  const results = await searchPublicListings({
    especialidade,
    cidade,
    convenio,
    teleconsult: teleconsult || undefined,
    presencial: presencial || undefined,
    priceMax: priceMax != null && !Number.isNaN(priceMax) ? priceMax : null,
    minRating: minRating != null && !Number.isNaN(minRating) ? minRating : null,
    availableOnly: availableOnly || undefined,
    sort,
    locale,
  });

  return NextResponse.json({
    especialidade,
    cidade,
    count: results.length,
    results,
  });
}
