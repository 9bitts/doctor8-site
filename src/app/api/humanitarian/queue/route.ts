import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import {
  assignNextInPool,
  cancelHumanitarianEntry,
  countActiveInPool,
  getEntryStatus,
  HumanitarianAlreadyInQueueError,
  HumanitarianQueueFullError,
  joinHumanitarianQueue,
} from "@/lib/humanitarian/dispatcher";
import { notifyHumanitarianJoined } from "@/lib/humanitarian/notify";
import { scheduleHumanitarianAnamneseReminder } from "@/lib/qstash";
import { requireValidIntake } from "@/lib/humanitarian/intake";
import { decryptHumanitarianIntakeFields } from "@/lib/humanitarian/intake-encryption";
import type { HumanitarianTriageData } from "@/lib/humanitarian/triage";
import { resolvePatientHumanitarianPhone } from "@/lib/humanitarian/phone";
import { isHumanitarianPhoneGateEnabled } from "@/lib/humanitarian/feature-flags";
import { hasTelemedicineTcle } from "@/lib/consent/telemedicine-tcle";
import { getPatientActiveHumanitarianEntry } from "@/lib/humanitarian/notify";
import { checkRateLimit, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";
import { normalizeLang, translate } from "@/lib/i18n/translations";
import { readJsonBody } from "@/lib/safe-json";

export const runtime = "nodejs";

const joinSchema = z.object({
  campaignSlug: z.string(),
  poolSlug: z.string(),
  chiefComplaint: z.string().max(2000).optional(),
  lang: z.enum(["pt", "en", "es"]).optional(),
});

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ errorCode: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ errorCode: "FORBIDDEN", error: "Forbidden" }, { status: 403 });
  }

  const entryId = new URL(req.url).searchParams.get("entryId");
  const campaignSlug = new URL(req.url).searchParams.get("campaignSlug");
  const lang = new URL(req.url).searchParams.get("lang") || "es";

  if (campaignSlug) {
    const active = await getPatientActiveHumanitarianEntry(session.user.id);
    if (!active || active.pool.campaign.slug !== campaignSlug) {
      return NextResponse.json({ entry: null });
    }
    const status = await getEntryStatus(active.id, session.user.id, lang);
    return NextResponse.json({ entry: status });
  }

  if (!entryId) {
    return NextResponse.json(
      { errorCode: "VALIDATION_ERROR", error: "entryId or campaignSlug required" },
      { status: 400 },
    );
  }

  const status = await getEntryStatus(entryId, session.user.id, lang);
  if (!status) return NextResponse.json({ errorCode: "NOT_FOUND", error: "Not found" }, { status: 404 });

  return NextResponse.json({ entry: status });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ errorCode: "UNAUTHORIZED", error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ errorCode: "FORBIDDEN", error: "Only patients can join" }, { status: 403 });
  }

  const body = await readJsonBody(req);
  if (body === null) {
    return NextResponse.json(
      { errorCode: "INVALID_BODY", error: "INVALID_BODY", message: "Invalid request body." },
      { status: 400 },
    );
  }
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { errorCode: "VALIDATION_ERROR", error: parsed.error.flatten() },
      { status: 400 },
    );
  }

  const { campaignSlug, poolSlug, chiefComplaint, lang: bodyLang } = parsed.data;
  const lang = bodyLang || "es";

  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    include: {
      pools: { where: { slug: poolSlug } },
    },
  });

  if (!campaign?.active || !campaign.pools[0]) {
    return NextResponse.json(
      { errorCode: "CAMPAIGN_UNAVAILABLE", error: "Campaign or pool not available" },
      { status: 404 },
    );
  }

  const pool = campaign.pools[0];

  const intake = await requireValidIntake(campaign.id, session.user.id);
  if (!intake?.computedPriority) {
    return NextResponse.json(
      {
        errorCode: "TRIAGE_REQUIRED",
        error: "TRIAGE_REQUIRED",
        message: "Complete initial triage before joining the queue.",
      },
      { status: 403 },
    );
  }

  const priority = intake.computedPriority;

  const decrypted = decryptHumanitarianIntakeFields({ triageData: intake.triageData });
  const triageQuick = (decrypted.triageData as HumanitarianTriageData | null)?.quickComplaint?.trim();
  const effectiveComplaint = chiefComplaint?.trim() || triageQuick || undefined;

  if (!(await hasTelemedicineTcle(session.user.id))) {
    return NextResponse.json(
      {
        errorCode: "TCLE_REQUIRED",
        error: "TCLE_REQUIRED",
        message: "Sign the telemedicine consent form before joining the queue.",
      },
      { status: 403 },
    );
  }

  if (isHumanitarianPhoneGateEnabled() && !(await resolvePatientHumanitarianPhone(session.user.id))) {
    return NextResponse.json(
      {
        errorCode: "PHONE_REQUIRED",
        error: "PHONE_REQUIRED",
        message: "Register your WhatsApp phone number before joining the queue.",
      },
      { status: 403 },
    );
  }

  const existing = await db.humanitarianQueueEntry.findFirst({
    where: {
      campaignId: campaign.id,
      patientUserId: session.user.id,
      status: { in: ["WAITING", "CALLED", "IN_PROGRESS"] },
    },
  });
  if (existing) {
    if (existing.poolId === pool.id) {
      const status = await getEntryStatus(existing.id, session.user.id, lang);
      return NextResponse.json({ entry: status, alreadyInQueue: true });
    }

    if (existing.status === "IN_PROGRESS") {
      return NextResponse.json(
        {
          errorCode: "CANNOT_SWITCH_IN_CONSULT",
          error: "CANNOT_SWITCH_IN_CONSULT",
          message: "Finish or leave the current consultation before choosing another service.",
        },
        { status: 409 },
      );
    }

    const cancelled = await cancelHumanitarianEntry(existing.id, session.user.id);
    if (!cancelled) {
      return NextResponse.json(
        { errorCode: "VALIDATION_ERROR", error: "Cannot switch queue" },
        { status: 400 },
      );
    }
  }

  const rate = await checkRateLimit({
    namespace: "humanitarian:join",
    key: session.user.id,
    ...RATE_LIMITS.humanitarianJoin,
  });
  if (!rate.allowed) {
    return NextResponse.json(
      {
        errorCode: "RATE_LIMITED",
        error: "RATE_LIMITED",
        message: "Too many queue join attempts. Please wait before trying again.",
        retryAfterSec: rate.retryAfterSec,
      },
      { status: 429, headers: { "Retry-After": String(rate.retryAfterSec) } },
    );
  }

  const activeCount = await countActiveInPool(pool.id);
  if (activeCount >= pool.maxWaiting) {
    return NextResponse.json(
      { errorCode: "QUEUE_FULL", error: "QUEUE_FULL", message: translate(lang, "hum.api.queueFullMessage") },
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
      chiefComplaint: effectiveComplaint,
      maxWaiting: pool.maxWaiting,
      intakeId: intake.id,
    });
  } catch (e) {
    if (e instanceof HumanitarianQueueFullError) {
      return NextResponse.json(
        { errorCode: "QUEUE_FULL", error: "QUEUE_FULL", message: translate(lang, "hum.api.queueFullMessage") },
        { status: 429 },
      );
    }
    if (e instanceof HumanitarianAlreadyInQueueError) {
      const active = await getPatientActiveHumanitarianEntry(session.user.id);
      if (active) {
        const status = await getEntryStatus(active.id, session.user.id, lang);
        return NextResponse.json({ entry: status, alreadyInQueue: true });
      }
      return NextResponse.json(
        { errorCode: "ALREADY_IN_QUEUE", error: "Already in queue" },
        { status: 409 },
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

  if (intake.status !== "COMPLETE") {
    await scheduleHumanitarianAnamneseReminder({
      patientUserId: session.user.id,
      campaignSlug: campaign.slug,
      intakeId: intake.id,
    });
  }

  await assignNextInPool(pool.id);

  const status = await getEntryStatus(entry.id, session.user.id);
  return NextResponse.json({ entry: status }, { status: 201 });
}
