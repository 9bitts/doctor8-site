// ADMIN ONLY — list all buying clubs with combined member counts (patients + professionals)
import { NextResponse } from "next/server";
import { getAdminSession } from "@/lib/admin";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getAdminSession();
  if (!session) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const clubs = await db.buyingClub.findMany({
    orderBy: { updatedAt: "desc" },
    include: {
      drugCatalog: {
        select: {
          name: true,
          activeIngredient: true,
          presentation: true,
          manufacturer: true,
        },
      },
      members: {
        where: { active: true },
        select: { id: true, user: { select: { role: true } } },
      },
    },
  });

  return NextResponse.json({
    clubs: clubs.map((c) => {
      const patientCount = c.members.filter((m) => m.user.role === "PATIENT").length;
      const professionalCount = c.members.filter((m) => m.user.role === "PROFESSIONAL").length;
      return {
        id: c.id,
        status: c.status,
        activeCount: c.members.length,
        patientCount,
        professionalCount,
        shareToken: c.shareToken,
        drugName: c.drugCatalog.name,
        activeIngredient: c.drugCatalog.activeIngredient,
        presentation: c.drugCatalog.presentation,
        manufacturer: c.drugCatalog.manufacturer,
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    }),
  });
}
