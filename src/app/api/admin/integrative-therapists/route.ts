import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET(_req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profiles = await db.integrativeTherapistProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          email: true,
          region: true,
          _count: { select: { providerLicenseDocuments: true } },
        },
      },
      _count: { select: { appointments: true, clientRecords: true } },
    },
  });

  const providers = profiles.map((p) => ({
    id: p.id,
    userId: p.userId,
    name: `${p.firstName} ${p.lastName}`.trim(),
    email: p.user?.email ?? null,
    region: p.user?.region ?? null,
    subtitle: p.picsPractices.length
      ? `${p.picsPractices.length} pr?tica(s) PICS ? ${p.trainingInstitution}`
      : p.trainingInstitution,
    verified: p.verified,
    verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
    appointments: p._count.appointments,
    charts: p._count.clientRecords,
    createdAt: p.createdAt.toISOString(),
    isPublic: false,
    licenseDocCount: p.user?._count.providerLicenseDocuments ?? 0,
    publicUrl: null as string | null,
  }));

  return NextResponse.json({ providers });
}
