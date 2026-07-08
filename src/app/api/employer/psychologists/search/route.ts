import { NextRequest, NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { isPsychologistSpecialty } from "@/lib/psychologist-portal";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "HR", "SST"]);
  if ("error" in ctx) return ctx.error;

  const q = req.nextUrl.searchParams.get("q")?.trim() ?? "";
  if (q.length < 2) {
    return NextResponse.json({ psychologists: [] });
  }

  const orClauses: Array<Record<string, unknown>> = [
    { firstName: { contains: q, mode: "insensitive" } },
    { lastName: { contains: q, mode: "insensitive" } },
    { licenseNumber: { contains: q, mode: "insensitive" } },
  ];
  if (q.length >= 8 && !q.includes(" ")) {
    orClauses.push({ id: q });
  }

  const rows = await db.professionalProfile.findMany({
    where: {
      verified: true,
      OR: orClauses as never,
    },
    take: 25,
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialty: true,
      licenseNumber: true,
      clinicCity: true,
      clinicState: true,
    },
  });

  const psychologists = rows
    .filter((p) => isPsychologistSpecialty(p.specialty))
    .map((p) => ({
      id: p.id,
      name: `${p.firstName} ${p.lastName}`.trim(),
      specialty: p.specialty,
      licenseNumber: p.licenseNumber,
      location: [p.clinicCity, p.clinicState].filter(Boolean).join(" / ") || null,
    }));

  return NextResponse.json({ psychologists });
}
