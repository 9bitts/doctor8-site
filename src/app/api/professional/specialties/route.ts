// GET — distinct verified professional specialties for referral picker.

import { NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getProfessionInfo } from "@/lib/profession-label";

export async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const rows = await db.professionalProfile.findMany({
    where: { verified: true, userId: { not: ctx.userId } },
    select: { specialty: true },
    distinct: ["specialty"],
    orderBy: { specialty: "asc" },
  });

  const specialties = rows
    .map((r) => r.specialty.trim())
    .filter(Boolean)
    .sort((a, b) => a.localeCompare(b, "pt"));

  const grouped: Record<string, string[]> = {};
  for (const s of specialties) {
    const typeKey = getProfessionInfo(s).typeKey;
    if (!grouped[typeKey]) grouped[typeKey] = [];
    grouped[typeKey].push(s);
  }

  return NextResponse.json({ specialties, grouped });
}
