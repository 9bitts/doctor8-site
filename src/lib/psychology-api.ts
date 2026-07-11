// Shared helpers for psychology API routes.
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { isPsychologistSpecialty } from "@/lib/psychologist-portal";
import type { ClinicalRecordKind, Prisma } from "@prisma/client";

const PROFESSIONAL_SELECT = {
  id: true,
  userId: true,
  specialty: true,
  firstName: true,
  lastName: true,
  licenseNumber: true,
  licenseState: true,
} as const;

export type PsychologyProfessional = {
  id: string;
  userId: string;
  specialty: string;
  firstName: string;
  lastName: string;
  licenseNumber: string | null;
  licenseState: string | null;
};

/** DB filter: typed recordKind + legacy OTHER docs (pre-backfill fallback). */
export function psychologyRecordKindWhere(
  kind: Extract<ClinicalRecordKind, "SESSION_NOTE" | "SCALE">,
): Prisma.MedicalDocumentWhereInput {
  return {
    OR: [{ recordKind: kind }, { recordKind: "OTHER" }],
  };
}

export async function requireProfessional() {
  const session = await auth();
  if (!session?.user) return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  if (session.user.role !== "PROFESSIONAL")
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: PROFESSIONAL_SELECT,
  });
  if (!professional) return { error: NextResponse.json({ error: "No profile" }, { status: 404 }) };

  return { session, professional };
}

export async function requirePsychologist() {
  const result = await requireProfessional();
  if ("error" in result) return result;
  if (!isPsychologistSpecialty(result.professional.specialty)) {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }
  return result;
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
