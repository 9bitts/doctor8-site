// src/app/api/professional/search-pros/route.ts
// GET — search other professionals by name or specialty (for resource sharing)
import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const specialtyFilter = req.nextUrl.searchParams.get("specialty")?.trim() || "";
  if (q.length < 2 && !specialtyFilter) return NextResponse.json({ professionals: [] });

  const psychologySpecialties = [
    "Psychologist", "Psychology", "Psychoanalyst", "Neuropsychologist", "Psychotherapist", "Behavioral Therapist",
  ];

  const pros = await db.professionalProfile.findMany({
    where: {
      userId: { not: ctx.userId },
      verified: true,
      ...(specialtyFilter === "psychology"
        ? { specialty: { in: psychologySpecialties } }
        : {}),
      ...(q.length >= 2
        ? {
            OR: [
              { firstName: { contains: q, mode: "insensitive" } },
              { lastName: { contains: q, mode: "insensitive" } },
              { specialty: { contains: q, mode: "insensitive" } },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialty: true,
      user: { select: { email: true } },
    },
    take: 10,
  });

  return NextResponse.json({
    professionals: pros.map((p) => ({
      id:        p.id,
      name:      `Dr. ${p.firstName} ${p.lastName}`,
      specialty: p.specialty,
      email:     p.user.email,
    })),
  });
}
