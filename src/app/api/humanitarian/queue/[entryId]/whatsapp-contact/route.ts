import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { handoffHumanitarianEntryViaWhatsApp } from "@/lib/humanitarian/dispatcher";
import type { Lang } from "@/lib/i18n/translations";

function volunteerLang(req: NextRequest): Lang {
  const raw = new URL(req.url).searchParams.get("lang");
  if (raw === "pt" || raw === "en" || raw === "es") return raw;
  return "es";
}

export async function POST(
  req: NextRequest,
  { params }: { params: { entryId: string } },
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!["PROFESSIONAL", "PSYCHOANALYST", "INTEGRATIVE_THERAPIST"].includes(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const lang = volunteerLang(req);

  try {
    const result = await handoffHumanitarianEntryViaWhatsApp(
      params.entryId,
      session.user.id,
      lang,
    );
    return NextResponse.json({ success: true, ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Error";
    if (msg === "NO_PHONE") {
      return NextResponse.json(
        { error: "NO_PHONE", message: "Patient has no WhatsApp phone on file." },
        { status: 422 },
      );
    }
    if (msg === "NOT_ACTIVE") {
      return NextResponse.json({ error: "NOT_ACTIVE" }, { status: 409 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
