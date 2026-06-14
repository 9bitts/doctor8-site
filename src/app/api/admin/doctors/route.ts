// src/app/api/admin/doctors/route.ts
// ADMIN ONLY — list all professionals with key info and counts.
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const pros = await db.professionalProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { email: true, region: true, createdAt: true } },
      _count: { select: { appointments: true, patientRecords: true } },
    },
  });

  const doctors = pros.map((p) => ({
    id: p.id,
    name: `${p.firstName} ${p.lastName}`.trim(),
    email: p.user?.email ?? null,
    region: p.user?.region ?? null,
    specialty: p.specialty,
    licenseNumber: p.licenseNumber,
    licenseCountry: p.licenseCountry,
    verified: p.verified,
    verifiedAt: p.verifiedAt ? p.verifiedAt.toISOString() : null,
    appointments: p._count.appointments,
    charts: p._count.patientRecords,
    createdAt: p.createdAt.toISOString(),
  }));

  return NextResponse.json({ doctors });
}
