// ADMIN ONLY — list all buying clubs with active member counts
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
      members: { where: { active: true }, select: { id: true } },
    },
  });

  return NextResponse.json({
    clubs: clubs.map((c) => ({
      id: c.id,
      status: c.status,
      activeCount: c.members.length,
      shareToken: c.shareToken,
      drugName: c.drugCatalog.name,
      activeIngredient: c.drugCatalog.activeIngredient,
      presentation: c.drugCatalog.presentation,
      manufacturer: c.drugCatalog.manufacturer,
      createdAt: c.createdAt.toISOString(),
      updatedAt: c.updatedAt.toISOString(),
    })),
  });
}
