import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { getAngelPatientDetail, resolveAngelAccess } from "@/lib/humanitarian/angel";
import type { Lang } from "@/lib/i18n/translations";

function volunteerLang(req: NextRequest): Lang {
  const raw = new URL(req.url).searchParams.get("lang");
  if (raw === "pt" || raw === "en" || raw === "es") return raw;
  return "pt";
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ patientUserId: string }> },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ANGEL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { patientUserId } = await params;
  const campaignSlug = new URL(req.url).searchParams.get("campaignSlug") || VENEZUELA_CAMPAIGN_SLUG;
  const lang = volunteerLang(req);

  const access = await resolveAngelAccess(session.user.id, campaignSlug);
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const detail = await getAngelPatientDetail(access.campaignId, patientUserId, lang);
  if (!detail) {
    return NextResponse.json({ error: "Patient not found or no consent" }, { status: 404 });
  }

  return NextResponse.json({ patient: detail });
}
