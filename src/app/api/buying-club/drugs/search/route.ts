// GET — search DrugCatalog for buying club (patients + professionals)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canUseBuyingClub } from "@/lib/buying-club-auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canUseBuyingClub(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const q = (searchParams.get("q") || "").trim().toLowerCase();
  const country = searchParams.get("country") || "BR";

  if (q.length < 2) return NextResponse.json({ drugs: [] });

  const drugs = await db.drugCatalog.findMany({
    where: {
      active: true,
      country,
      OR: [
        { searchName: { contains: q } },
        { searchIngredient: { contains: q } },
      ],
    },
    select: {
      id: true,
      name: true,
      activeIngredient: true,
      presentation: true,
      manufacturer: true,
    },
    orderBy: { name: "asc" },
    take: 20,
  });

  return NextResponse.json({ drugs });
}
