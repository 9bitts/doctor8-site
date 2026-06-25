// GET ? list open buying clubs with at least one active member
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { canUseBuyingClub } from "@/lib/buying-club-auth";

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!canUseBuyingClub(session.user.role)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const clubs = await db.buyingClub.findMany({
    where: {
      status: { not: "CLOSED" },
      members: { some: { active: true } },
    },
    orderBy: { updatedAt: "desc" },
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
      members: {
        where: { active: true },
        select: { userId: true },
      },
    },
  });

  const userId = session.user.id;

  return NextResponse.json({
    clubs: clubs
      .map((c) => ({
        id: c.id,
        status: c.status,
        activeCount: c.members.length,
        isMember: c.members.some((m) => m.userId === userId),
        drug: c.drugCatalog,
      }))
      .sort((a, b) => b.activeCount - a.activeCount),
  });
}
