import { NextRequest, NextResponse } from "next/server";
import { requireIntegrativeTherapist, safeDecrypt } from "@/lib/integrative-therapist-api";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const q = (req.nextUrl.searchParams.get("q") || "").trim().toLowerCase();

  const records = await db.integrativeClientRecord.findMany({
    where: { integrativeTherapistId: therapist.id },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const decoded = records
    .map((r) => {
      const firstName = safeDecrypt(r.firstName);
      const lastName = safeDecrypt(r.lastName);
      const dobDecrypted = r.dateOfBirth ? safeDecrypt(r.dateOfBirth) : null;
      const missing: string[] = [];
      if (!(firstName && lastName)) missing.push("name");
      if (!dobDecrypted) missing.push("dob");
      return {
        id: r.id,
        firstName,
        lastName,
        email: r.email || null,
        hasAccount: !!r.linkedUserId,
        missingForRx: missing,
      };
    })
    .filter((r) => {
      if (!q) return true;
      const hay = `${r.firstName} ${r.lastName} ${r.email || ""}`.toLowerCase();
      return hay.includes(q);
    });

  return NextResponse.json({ records: decoded, importable: [], platformMatches: [] });
}
