// src/app/api/professionals/[id]/route.ts
// Returns full profile of a single professional

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const professional = await db.professionalProfile.findUnique({
    where: { id: params.id, verified: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialty: true,
      subspecialties: true,
      bio: true,
      avatarUrl: true,
      consultPrice: true,
      currency: true,
      acceptsTeleconsult: true,
      acceptsInPerson: true,
      clinicName: true,
      clinicCity: true,
      clinicState: true,
      clinicCountry: true,
      licenseNumber: true,
      licenseState: true,
    },
  });

  if (!professional) {
    return NextResponse.json({ error: "Professional not found" }, { status: 404 });
  }

  return NextResponse.json({ professional });
}
