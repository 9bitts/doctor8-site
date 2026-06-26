import { NextResponse } from "next/server";
import { requireProfessional } from "@/lib/psychology-api";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export async function GET() {
  const ctx = await requireProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional } = ctx;

  const clinicIds = (
    await db.clinicMember.findMany({
      where: { professionalId: professional.id },
      select: { clinicId: true },
    })
  ).map((m) => m.clinicId);

  const shares = await db.patientRecordShare.findMany({
    where: {
      revokedAt: null,
      OR: [
        { sharedWithProfessionalId: professional.id },
        ...(clinicIds.length > 0 ? [{ clinicId: { in: clinicIds } }] : []),
      ],
    },
    include: {
      patientRecord: {
        include: {
          professional: { select: { firstName: true, lastName: true, specialty: true } },
        },
      },
      sharedBy: { select: { firstName: true, lastName: true } },
      clinic: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const items = shares
    .filter((s) => s.patientRecord)
    .map((s) => {
      const rec = s.patientRecord!;
      return {
        shareId: s.id,
        recordId: rec.id,
        permission: s.permission,
        patientName: `${safeDecrypt(rec.firstName)} ${safeDecrypt(rec.lastName)}`.trim(),
        ownerName: `Dr. ${s.sharedBy.firstName} ${s.sharedBy.lastName}`,
        ownerSpecialty: rec.professional.specialty,
        sharedVia: s.clinic ? s.clinic.name : "direct",
        sharedAt: s.createdAt.toISOString(),
      };
    });

  return NextResponse.json({ charts: items });
}
