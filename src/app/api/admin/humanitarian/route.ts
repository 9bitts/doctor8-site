import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { getCampaignStats } from "@/lib/humanitarian/dispatcher";
import { seedVenezuelaCampaign } from "@/lib/humanitarian/seed-venezuela";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const campaigns = await db.humanitarianCampaign.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { entries: true, volunteers: true, pools: true } },
    },
  });

  const enriched = await Promise.all(
    campaigns.map(async (c) => {
      const poolStats = await getCampaignStats(c.id);
      const waitingTotal = poolStats.reduce((s, p) => s + p.waiting, 0);
      return {
        id: c.id,
        slug: c.slug,
        name: c.name,
        active: c.active,
        region: c.region,
        poolCount: c._count.pools,
        volunteerCount: c._count.volunteers,
        entryCount: c._count.entries,
        waitingTotal,
        pools: poolStats.map((p) => ({
          slug: p.slug,
          labelEs: p.labelEs,
          maxWaiting: p.maxWaiting,
          waiting: p.waiting,
          volunteersOnline: p.volunteersOnline,
          volunteersBusy: p.volunteersBusy,
        })),
      };
    }),
  );

  return NextResponse.json({ campaigns: enriched });
}

export async function POST(req: Request) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  if (body.action === "seed-venezuela") {
    const campaign = await seedVenezuelaCampaign();
    return NextResponse.json({ campaign }, { status: 201 });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
