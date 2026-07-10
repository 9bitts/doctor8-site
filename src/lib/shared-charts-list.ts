// Shared patient charts visible to a colleague (direct or clinic share).

import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}

export type SharedChartListItem = {
  recordId: string;
  firstName: string;
  lastName: string;
  hasAccount: boolean;
  updatedAt: string;
  permission: "VIEW" | "EDIT";
  ownerName: string;
  sharedVia: string;
};

export async function listSharedChartsForProfessional(
  professionalId: string,
): Promise<SharedChartListItem[]> {
  const clinicIds = (
    await db.clinicMember.findMany({
      where: { professionalId },
      select: { clinicId: true },
    })
  ).map((m) => m.clinicId);

  const shares = await db.patientRecordShare.findMany({
    where: {
      revokedAt: null,
      OR: [
        { sharedWithProfessionalId: professionalId },
        ...(clinicIds.length > 0 ? [{ clinicId: { in: clinicIds } }] : []),
      ],
    },
    include: {
      patientRecord: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          linkedUserId: true,
          updatedAt: true,
        },
      },
      sharedBy: { select: { firstName: true, lastName: true } },
      clinic: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const seen = new Set<string>();
  const items: SharedChartListItem[] = [];

  for (const s of shares) {
    const rec = s.patientRecord;
    if (!rec || seen.has(rec.id)) continue;
    seen.add(rec.id);

    items.push({
      recordId: rec.id,
      firstName: safeDecrypt(rec.firstName),
      lastName: safeDecrypt(rec.lastName),
      hasAccount: !!rec.linkedUserId,
      updatedAt: rec.updatedAt.toISOString(),
      permission: s.permission,
      ownerName: `Dr. ${s.sharedBy.firstName} ${s.sharedBy.lastName}`.trim(),
      sharedVia: s.clinic?.name ?? "direct",
    });
  }

  return items;
}
