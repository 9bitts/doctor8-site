import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getWorkforceMembershipForUser } from "@/lib/employer-workforce";
import { recommendContentForHazards, PSYCHOED_TRAILS } from "@/lib/employer-psychoed-content";
import { listContentAssets } from "@/lib/employer-content-assets";
import { db } from "@/lib/db";

export async function GET() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getWorkforceMembershipForUser(session.user.id, session.user.email);
  if (!membership) {
    return NextResponse.json({ error: "No active benefit" }, { status: 404 });
  }

  const highRisks = await db.employerRiskEntry.findMany({
    where: {
      employerCompanyId: membership.employerCompanyId,
      riskLevel: { in: ["HIGH", "CRITICAL", "MEDIUM"] },
    },
    select: { hazardCode: true },
    take: 20,
  });

  const hazardCodes = highRisks.map((r) => r.hazardCode);
  const recommended = recommendContentForHazards(hazardCodes.length ? hazardCodes : ["SOBRECARGA"], 5);

  const completed = await db.employerContentProgress.findMany({
    where: {
      employerCompanyId: membership.employerCompanyId,
      workforceMemberId: membership.id,
    },
    select: { contentId: true, progressSecs: true },
  });
  const completedSet = new Set(completed.map((c) => c.contentId));
  const assets = await listContentAssets();
  const assetMap = new Map(assets.map((a) => [a.contentId, a]));

  const enrich = (c: (typeof PSYCHOED_TRAILS)[number]) => {
    const asset = assetMap.get(c.id);
    const progress = completed.find((p) => p.contentId === c.id);
    return {
      ...c,
      completed: completedSet.has(c.id),
      progressSecs: progress?.progressSecs ?? 0,
      audioUrl: asset?.publicUrl ?? (asset?.audioKey ? `/api/workforce/content/audio/${c.id}` : null),
      transcript: asset?.transcript ?? null,
      durationSecs: asset?.durationSecs ?? null,
    };
  };

  return NextResponse.json({
    recommended: recommended.map(enrich),
    catalog: PSYCHOED_TRAILS.map(enrich),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await req.json();
  const contentId = body?.contentId as string | undefined;
  if (!contentId) {
    return NextResponse.json({ error: "Missing contentId" }, { status: 400 });
  }

  const membership = await getWorkforceMembershipForUser(session.user.id, session.user.email);
  if (!membership) {
    return NextResponse.json({ error: "No active benefit" }, { status: 404 });
  }

  const exists = await db.employerContentProgress.findFirst({
    where: {
      employerCompanyId: membership.employerCompanyId,
      workforceMemberId: membership.id,
      contentId,
    },
  });

  const progressSecs = typeof body?.progressSecs === "number" ? body.progressSecs : 0;

  if (!exists) {
    await db.employerContentProgress.create({
      data: {
        employerCompanyId: membership.employerCompanyId,
        workforceMemberId: membership.id,
        contentId,
        progressSecs,
      },
    });
  } else if (progressSecs > exists.progressSecs) {
    await db.employerContentProgress.update({
      where: { id: exists.id },
      data: { progressSecs },
    });
  }

  return NextResponse.json({ success: true });
}
