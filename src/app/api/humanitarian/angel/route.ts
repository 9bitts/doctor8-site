import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { listAngelFollowUpPatients, resolveAngelAccess } from "@/lib/humanitarian/angel";
import type { Lang } from "@/lib/i18n/translations";

function volunteerLang(req: NextRequest): Lang {
  const raw = new URL(req.url).searchParams.get("lang");
  if (raw === "pt" || raw === "en" || raw === "es") return raw;
  return "pt";
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ errorCode: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });

  const campaignSlug = new URL(req.url).searchParams.get("campaignSlug") || VENEZUELA_CAMPAIGN_SLUG;
  const lang = volunteerLang(req);

  if (session.user.role !== "ANGEL" && session.user.role !== "ADMIN") {
    return NextResponse.json({ errorCode: "FORBIDDEN", error: "Forbidden" }, { status: 403 });
  }

  const profile = await db.angelProfile.findUnique({
    where: { userId: session.user.id },
    select: {
      firstName: true,
      lastName: true,
      approvalStatus: true,
      rejectionReason: true,
    },
  });

  if (!profile) {
    return NextResponse.json({ errorCode: "NOT_FOUND", error: "Profile not found" }, { status: 404 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerified: true },
  });

  const access = await resolveAngelAccess(session.user.id, campaignSlug);
  if (!access.ok) {
    return NextResponse.json({
      status: access.reason,
      profile,
      emailVerified: !!user?.emailVerified,
      patients: [],
    });
  }

  const patients = await listAngelFollowUpPatients(access.campaignId, lang);

  return NextResponse.json({
    status: "ACTIVE",
    profile,
    emailVerified: true,
    patients,
  });
}
