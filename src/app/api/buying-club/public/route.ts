// Public preview of a buying club invite (no auth required)
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const drugCatalogId = searchParams.get("drugCatalogId");

  if (!token && !drugCatalogId) {
    return NextResponse.json({ error: "token or drugCatalogId required" }, { status: 400 });
  }

  const club = token
    ? await db.buyingClub.findFirst({
        where: { shareToken: token },
        include: {
          drugCatalog: {
            select: {
              id: true,
              name: true,
              activeIngredient: true,
              presentation: true,
              manufacturer: true,
            },
          },
          members: { where: { active: true }, select: { id: true } },
        },
      })
    : await db.buyingClub.findUnique({
        where: { drugCatalogId: drugCatalogId! },
        include: {
          drugCatalog: {
            select: {
              id: true,
              name: true,
              activeIngredient: true,
              presentation: true,
              manufacturer: true,
            },
          },
          members: { where: { active: true }, select: { id: true } },
        },
      });

  let drug = club?.drugCatalog ?? null;
  let activeCount = club?.members.length ?? 0;

  if (!drug && drugCatalogId) {
    drug = await db.drugCatalog.findUnique({
      where: { id: drugCatalogId, active: true },
      select: {
        id: true,
        name: true,
        activeIngredient: true,
        presentation: true,
        manufacturer: true,
      },
    });
  }

  if (!drug) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    drug,
    activeCount,
    status: club?.status ?? "OPEN",
    exists: Boolean(club),
  });
}
