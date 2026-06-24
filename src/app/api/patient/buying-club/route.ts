// GET — club info for a drug or share token
// POST — join a buying club (creates club if first member)
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const joinSchema = z.object({
  drugCatalogId: z.string().min(1),
});

async function clubPayload(
  club: {
    id: string;
    shareToken: string;
    status: string;
    drugCatalog: {
      id: string;
      name: string;
      activeIngredient: string;
      presentation: string;
    };
    members: { userId: string; active: boolean }[];
  },
  userId: string
) {
  const activeCount = club.members.filter((m) => m.active).length;
  const isMember = club.members.some((m) => m.userId === userId && m.active);

  return {
    clubId: club.id,
    shareToken: club.shareToken,
    status: club.status,
    activeCount,
    isMember,
    exists: true,
    drug: club.drugCatalog,
  };
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { searchParams } = new URL(req.url);
  const drugCatalogId = searchParams.get("drugCatalogId");
  const token = searchParams.get("token");

  if (!drugCatalogId && !token) {
    return NextResponse.json({ error: "drugCatalogId or token required" }, { status: 400 });
  }

  const club = await db.buyingClub.findFirst({
    where: token ? { shareToken: token } : { drugCatalogId: drugCatalogId! },
    include: {
      drugCatalog: {
        select: { id: true, name: true, activeIngredient: true, presentation: true },
      },
      members: { select: { userId: true, active: true } },
    },
  });

  if (!club) {
    if (drugCatalogId) {
      const drug = await db.drugCatalog.findUnique({
        where: { id: drugCatalogId },
        select: { id: true, name: true, activeIngredient: true, presentation: true },
      });
      if (!drug) return NextResponse.json({ error: "Drug not found" }, { status: 404 });
      return NextResponse.json({
        exists: false,
        activeCount: 0,
        isMember: false,
        drug,
      });
    }
    return NextResponse.json({ error: "Club not found" }, { status: 404 });
  }

  return NextResponse.json(await clubPayload(club, session.user.id));
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json().catch(() => ({}));
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { drugCatalogId } = parsed.data;

  const drug = await db.drugCatalog.findUnique({
    where: { id: drugCatalogId, active: true },
    select: { id: true },
  });
  if (!drug) return NextResponse.json({ error: "Drug not found" }, { status: 404 });

  let club = await db.buyingClub.findUnique({
    where: { drugCatalogId },
    include: {
      drugCatalog: {
        select: { id: true, name: true, activeIngredient: true, presentation: true },
      },
      members: { select: { userId: true, active: true } },
    },
  });

  if (!club) {
    club = await db.buyingClub.create({
      data: { drugCatalogId },
      include: {
        drugCatalog: {
          select: { id: true, name: true, activeIngredient: true, presentation: true },
        },
        members: { select: { userId: true, active: true } },
      },
    });
  }

  const existing = await db.buyingClubMember.findUnique({
    where: {
      buyingClubId_userId: { buyingClubId: club.id, userId: session.user.id },
    },
  });

  if (existing?.active) {
    return NextResponse.json(await clubPayload(club, session.user.id));
  }

  if (existing && !existing.active) {
    await db.buyingClubMember.update({
      where: { id: existing.id },
      data: { active: true, leftAt: null, joinedAt: new Date() },
    });
  } else {
    await db.buyingClubMember.create({
      data: { buyingClubId: club.id, userId: session.user.id },
    });
  }

  const updated = await db.buyingClub.findUnique({
    where: { id: club.id },
    include: {
      drugCatalog: {
        select: { id: true, name: true, activeIngredient: true, presentation: true },
      },
      members: { select: { userId: true, active: true } },
    },
  });

  return NextResponse.json(await clubPayload(updated!, session.user.id));
}
