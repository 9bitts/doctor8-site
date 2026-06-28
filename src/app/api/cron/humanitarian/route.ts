import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { assignNextInPool, expireHumanitarianNoShows } from "@/lib/humanitarian/dispatcher";

function authorized(req: NextRequest): boolean {
  const secret = req.headers.get("x-cron-secret");
  return Boolean(process.env.CRON_SECRET && secret === process.env.CRON_SECRET);
}

/** Expire humanitarian no-shows and advance queues for all active campaigns. */
export async function POST(req: NextRequest) {
  if (!authorized(req)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const campaigns = await db.humanitarianCampaign.findMany({
    where: { active: true },
    include: { pools: { select: { id: true } } },
  });

  let expired = 0;
  let assigned = 0;

  for (const campaign of campaigns) {
    for (const pool of campaign.pools) {
      expired += await expireHumanitarianNoShows(pool.id);
      const entry = await assignNextInPool(pool.id);
      if (entry) assigned += 1;
    }
  }

  return NextResponse.json({ ok: true, expired, assigned, pools: campaigns.reduce((n, c) => n + c.pools.length, 0) });
}
