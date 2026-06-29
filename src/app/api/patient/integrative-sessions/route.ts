import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { normalizeLang } from "@/lib/i18n/translations";
import { db } from "@/lib/db";
import { getPatientIntegrativeSessions } from "@/lib/patient-integrative-sessions";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const user = await db.user.findUnique({
    where: { id: session.user.id },
    select: { language: true },
  });
  const lang = normalizeLang(user?.language);

  const sessions = await getPatientIntegrativeSessions(session.user.id, lang);
  return NextResponse.json({ sessions });
}
