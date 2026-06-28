// src/app/api/admin/doctors/route.ts
// ADMIN ONLY — list professionals (ProfessionalProfile) with optional category filter.
import { NextRequest, NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";
import { buildPublicProfileUrl } from "@/lib/public-profile";
import {
  isUncategorizedProfessional,
  specialtiesForCategory,
  type AdminProfessionalCategory,
} from "@/lib/admin-provider-categories";

const VALID_CATEGORIES = new Set<string>([
  "medicos",
  "psicologos",
  "nutricionistas",
  "fisioterapeutas",
  "outros",
]);

export async function GET(req: NextRequest) {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const category = new URL(req.url).searchParams.get("category");

  const pros = await db.professionalProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          email: true,
          region: true,
          createdAt: true,
          emailVerified: true,
          _count: { select: { providerLicenseDocuments: true } },
        },
      },
      virtualCard: true,
      _count: { select: { appointments: true, patientRecords: true } },
    },
  });

  let filtered = pros;
  if (category && VALID_CATEGORIES.has(category)) {
    if (category === "outros") {
      filtered = pros.filter((p) => isUncategorizedProfessional(p.specialty));
    } else {
      const allowed = new Set(specialtiesForCategory(category as AdminProfessionalCategory));
      filtered = pros.filter((p) => allowed.has(p.specialty));
    }
  }

  const doctors = filtered.map((p) => ({
    id: p.id,
    userId: p.userId,
    name: `${p.firstName} ${p.lastName}`.trim(),
    email: p.user?.email ?? null,
    region: p.user?.region ?? null,
    specialty: p.specialty,
    licenseNumber: p.licenseNumber,
    licenseCountry: p.licenseCountry,
    verified: p.verified,
    emailVerified: !!p.user?.emailVerified,
    verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
    appointments: p._count.appointments,
    charts: p._count.patientRecords,
    createdAt: p.createdAt.toISOString(),
    isPublic: p.virtualCard?.isPublic ?? false,
    licenseDocCount: p.user?._count.providerLicenseDocuments ?? 0,
    publicUrl:
      p.verified && p.virtualCard?.isPublic && p.virtualCard.specialtySlug && p.virtualCard.citySlug
        ? buildPublicProfileUrl(p.virtualCard)
        : null,
  }));

  return NextResponse.json({ doctors, total: doctors.length });
}
