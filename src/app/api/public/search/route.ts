import { NextRequest, NextResponse } from "next/server";
import { searchPublicListings } from "@/lib/public-search";
import { normalizeLang, localeOf } from "@/lib/i18n/translations";

export const dynamic = "force-dynamic";

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

  const results = await searchPublicListings({
    especialidade,
    cidade,
    convenio,
    teleconsult: teleconsult || undefined,
    presencial: presencial || undefined,
    locale,
  });

  return NextResponse.json({
    especialidade,
    cidade,
    count: results.length,
    results,
  });
}
