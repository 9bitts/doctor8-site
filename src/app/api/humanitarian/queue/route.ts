import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  assignNextInPool,
  countActiveInPool,
  getEntryStatus,
} from "@/lib/humanitarian/dispatcher";
import { notifyHumanitarianJoined } from "@/lib/humanitarian/notify";

const joinSchema = z.object({
  campaignSlug: z.string(),
  poolSlug: z.string(),
  chiefComplaint: z.string().max(2000).optional(),
  priority: z.enum(["ROUTINE", "URGENT", "CRISIS"]).default("ROUTINE"),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entryId = new URL(req.url).searchParams.get("entryId");
  if (!entryId) {
    return NextResponse.json({ error: "entryId required" }, { status: 400 });
  }

  const status = await getEntryStatus(entryId, session.user.id);
  if (!status) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ entry: status });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Only patients can join" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const { campaignSlug, poolSlug, chiefComplaint, priority } = parsed.data;

  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    include: {
      pools: { where: { slug: poolSlug } },
    },
  });

  if (!campaign?.active || !campaign.pools[0]) {
    return NextResponse.json({ error: "Campaign or pool not available" }, { status: 404 });
  }

  const pool = campaign.pools[0];

  const existing = await db.humanitarianQueueEntry.findFirst({
    where: {
      campaignId: campaign.id,
      patientUserId: session.user.id,
      status: { in: ["WAITING", "CALLED", "IN_PROGRESS"] },
    },
  });
  if (existing) {
    const status = await getEntryStatus(existing.id, session.user.id);
    return NextResponse.json({ entry: status, alreadyInQueue: true });
  }

  const activeCount = await countActiveInPool(pool.id);
  if (activeCount >= pool.maxWaiting) {
    return NextResponse.json(
      { error: "QUEUE_FULL", message: "La fila est? llena. Intenta m?s tarde." },
      { status: 429 },
    );
  }

  const last = await db.humanitarianQueueEntry.findFirst({
    where: { poolId: pool.id },
    orderBy: { position: "desc" },
  });
  const position = (last?.position ?? 0) + 1;

  const entry = await db.humanitarianQueueEntry.create({
    data: {
      campaignId: campaign.id,
      poolId: pool.id,
      patientUserId: session.user.id,
      status: "WAITING",
      priority,
      position,
      chiefComplaint: chiefComplaint || null,
    },
  });

  await notifyHumanitarianJoined({
    patientUserId: session.user.id,
    poolLabel: pool.labelEs,
    position,
    campaignSlug: campaign.slug,
  });

  await assignNextInPool(pool.id);

  const status = await getEntryStatus(entry.id, session.user.id);
  return NextResponse.json({ entry: status }, { status: 201 });
}
