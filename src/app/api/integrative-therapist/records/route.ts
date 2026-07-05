import { NextResponse } from "next/server";
import { requireIntegrativeTherapist, safeDecrypt } from "@/lib/integrative-therapist-api";
import { db } from "@/lib/db";

function computeMissingForRx(r: {
  firstName: string;
  lastName: string;
  dateOfBirth: string | null;
}): string[] {
  const missing: string[] = [];
  if (!(r.firstName && r.lastName)) missing.push("name");
  if (!r.dateOfBirth) missing.push("dob");
  return missing;
}

/** Client charts for prescription picker (same shape as professional PatientRecord list). */
export async function GET() {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const records = await db.integrativeClientRecord.findMany({
    where: { integrativeTherapistId: therapist.id },
    orderBy: { updatedAt: "desc" },
    take: 200,
  });

  const decoded = records.map((r) => {
    const firstName = safeDecrypt(r.firstName);
    const lastName = safeDecrypt(r.lastName);
    const dobDecrypted = r.dateOfBirth ? safeDecrypt(r.dateOfBirth) : null;
    return {
      id: r.id,
      firstName,
      lastName,
      email: r.email || null,
      hasAccount: !!r.linkedUserId,
      missingForRx: computeMissingForRx({ firstName, lastName, dateOfBirth: dobDecrypted }),
    };
  });

  return NextResponse.json({ records: decoded });
}
