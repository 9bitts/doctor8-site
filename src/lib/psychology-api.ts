// Shared helpers for psychology API routes.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPsychologist } from "@/lib/profession-label";
import { decrypt } from "@/lib/encryption";

export async function requirePsychologist() {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user.role !== "PROFESSIONAL")
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) return { error: NextResponse.json({ error: "No profile" }, { status: 404 }) };
  if (!isPsychologist(professional.specialty))
    return { error: NextResponse.json({ error: "Psychologist area only" }, { status: 403 }) };

  return { session, professional };
}

export function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export function parsePsychologyContent(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return typeof parsed === "object" && parsed !== null ? parsed as Record<string, unknown> : null;
  } catch {
    return null;
  }
}
