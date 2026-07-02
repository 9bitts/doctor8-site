import { NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { normalizeLang } from "@/lib/i18n/translations";
import { db } from "@/lib/db";
import { getPatientIntegrativeSessions } from "@/lib/patient-integrative-sessions";

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId } = ctx;

  const user = await db.user.findUnique({
    where: { id: userId },
    select: { language: true },
  });
  const lang = normalizeLang(user?.language);

  const sessions = await getPatientIntegrativeSessions(userId, lang);
  return NextResponse.json({ sessions });
}
