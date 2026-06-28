import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { buildPublicProfileUrl } from "@/lib/public-profile";

export async function GET(_req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const profiles = await db.psychoanalystProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          email: true,
          region: true,
          emailVerified: true,
          _count: { select: { providerLicenseDocuments: true } },
        },
      },
      virtualCard: true,
      _count: { select: { appointments: true, analysandRecords: true } },
    },
  });

  const providers = profiles.map((p) => ({
    id: p.id,
    userId: p.userId,
    name: `${p.firstName} ${p.lastName}`.trim(),
    email: p.user?.email ?? null,
    region: p.user?.region ?? null,
    subtitle: p.trainingInstitution,
    verified: p.verified,
    emailVerified: !!p.user?.emailVerified,
    verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
    appointments: p._count.appointments,
    charts: p._count.analysandRecords,
    createdAt: p.createdAt.toISOString(),
    isPublic: p.virtualCard?.isPublic ?? false,
    licenseDocCount: p.user?._count.providerLicenseDocuments ?? 0,
    publicUrl:
      p.verified && p.virtualCard?.isPublic && p.virtualCard.specialtySlug && p.virtualCard.citySlug
        ? buildPublicProfileUrl(p.virtualCard)
        : null,
  }));

  return NextResponse.json({ providers });
}
