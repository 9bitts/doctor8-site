// src/app/api/professional/search-pros/route.ts
// GET — search other professionals by name or specialty (for resource sharing)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  if (q.length < 2) return NextResponse.json({ professionals: [] });

  const pros = await db.professionalProfile.findMany({
    where: {
      userId: { not: session.user.id }, // exclude self
      OR: [
        { firstName: { contains: q, mode: "insensitive" } },
        { lastName:  { contains: q, mode: "insensitive" } },
        { specialty: { contains: q, mode: "insensitive" } },
      ],
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
