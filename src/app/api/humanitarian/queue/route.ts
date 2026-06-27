import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  assignNextInPool,
  countActiveInPool,
  getEntryStatus,
  HumanitarianQueueFullError,
  joinHumanitarianQueue,
} from "@/lib/humanitarian/dispatcher";
import { notifyHumanitarianJoined } from "@/lib/humanitarian/notify";
import { requireValidIntake } from "@/lib/humanitarian/intake";

const joinSchema = z.object({
  campaignSlug: z.string(),
  poolSlug: z.string(),
  chiefComplaint: z.string().max(2000).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const entryId = new URL(req.url).searchParams.get("entryId");
  const lang = new URL(req.url).searchParams.get("lang") || "es";
  if (!entryId) {
    return NextResponse.json({ error: "entryId required" }, { status: 400 });
  }

  const status = await getEntryStatus(entryId, session.user.id, lang);
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

  const { campaignSlug, poolSlug, chiefComplaint } = parsed.data;

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

  const intake = await requireValidIntake(campaign.id, session.user.id);
  if (!intake?.computedPriority) {
    return NextResponse.json(
      {
        error: "TRIAGE_REQUIRED",
        message: "Complete initial triage before joining the queue.",
      },
      { status: 403 },
    );
  }

  const priority = intake.computedPriority;

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

  let entry;
  try {
    entry = await joinHumanitarianQueue({
      campaignId: campaign.id,
      poolId: pool.id,
      patientUserId: session.user.id,
      priority,
      chiefComplaint,
      maxWaiting: pool.maxWaiting,
      intakeId: intake.id,
    });
  } catch (e) {
    if (e instanceof HumanitarianQueueFullError) {
      return NextResponse.json(
        { error: "QUEUE_FULL", message: "La fila est? llena. Intenta m?s tarde." },
        { status: 429 },
      );
    }
    throw e;
  }

  const position = entry.position;

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
