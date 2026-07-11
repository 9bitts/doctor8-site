// src/app/api/jit/session/route.ts
// GET  — get current professional's active JIT session (if any)
// POST — create/open a new JIT session (go online)
// PATCH — update session status (pause, go offline) or settings

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { JitQueueStatus } from "@prisma/client";
import { z } from "zod";
import { touchJitHeartbeat } from "@/lib/jit-session-lifecycle";
import { requireVerifiedProfessional } from "@/lib/professional-verified";
import { assertPsychologyProFeature } from "@/lib/psychology-plan-limits";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

const createSchema = z.object({
  mode:                        z.enum(["QUEUE", "SHOWCASE"]),
  specialty:                   z.string().min(1).max(100),
  isFree:                      z.boolean(),
  priceAmount:                 z.number().int().min(0).default(0),
  currency:                    z.string().default("BRL"),
  maxQueueSize:                z.number().int().min(1).max(500).default(50),
  estimatedMinutesPerPatient:  z.number().int().min(5).max(120).default(20),
  jitEventId:                  z.string().optional().or(z.literal("")),
});

const patchSchema = z.object({
  status: z.enum(["ONLINE", "PAUSED", "OFFLINE"]).optional(),
  mode:   z.enum(["QUEUE", "SHOWCASE"]).optional(),
  estimatedMinutesPerPatient: z.number().int().min(5).max(120).optional(),
  maxQueueSize: z.number().int().min(1).max(500).optional(),
});

function serializeJitSession(jitSession: {
  id: string;
  mode: string;
  status: string;
  specialty: string;
  isFree: boolean;
  priceAmount: number;
  currency: string;
  maxQueueSize: number;
  estimatedMinutesPerPatient: number;
  _count: { queue: number };
  queue: Array<{
    id: string;
    status: string;
    position: number;
    specialty: string;
    enteredAt: Date;
    calledAt: Date | null;
    expiresAt: Date | null;
    meetingUrl: string | null;
    patientUser: {
      id: string;
      patientProfile: { firstName: string; lastName: string } | null;
    } | null;
  }>;
}) {
  return {
    id:                          jitSession.id,
    mode:                        jitSession.mode,
    status:                      jitSession.status,
    specialty:                   jitSession.specialty,
    isFree:                      jitSession.isFree,
    priceAmount:                 jitSession.priceAmount,
    currency:                    jitSession.currency,
    maxQueueSize:                jitSession.maxQueueSize,
    estimatedMinutesPerPatient:  jitSession.estimatedMinutesPerPatient,
    queueCount:                  jitSession._count.queue,
    queue: jitSession.queue.map((q) => ({
      id:          q.id,
      status:      q.status,
      position:    q.position,
      specialty:   q.specialty,
      enteredAt:   q.enteredAt.toISOString(),
      calledAt:    q.calledAt?.toISOString() ?? null,
      expiresAt:   q.expiresAt?.toISOString() ?? null,
      meetingUrl:  q.meetingUrl ?? null,
      patientName: q.patientUser?.patientProfile
        ? `${safeDecrypt(q.patientUser.patientProfile.firstName)} ${safeDecrypt(q.patientUser.patientProfile.lastName)}`.trim()
        : "Paciente",
    })),
  };
}

const jitSessionInclude = {
  _count: {
    select: {
      queue: { where: { status: { in: [JitQueueStatus.WAITING, JitQueueStatus.CALLED] } } },
    },
  },
  queue: {
    where: { status: { in: [JitQueueStatus.WAITING, JitQueueStatus.CALLED, JitQueueStatus.IN_PROGRESS] } },
    orderBy: { position: "asc" as const },
    include: {
      patientUser: {
        select: {
          id: true,
          patientProfile: { select: { firstName: true, lastName: true } },
        },
      },
    },
  },
};

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  // Get active session (ONLINE or PAUSED)
  const jitSession = await db.jitSession.findFirst({
    where: {
      professionalId: professional.id,
      status: { in: ["ONLINE", "PAUSED"] },
    },
    include: jitSessionInclude,
  });

  if (!jitSession) return NextResponse.json({ session: null });

  await touchJitHeartbeat(professional.id);

  return NextResponse.json({ session: serializeJitSession(jitSession) });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const verified = await requireVerifiedProfessional(session.user.id);
  if (!verified.ok) {
    return NextResponse.json(
      { error: verified.error, code: "PROVIDER_NOT_VERIFIED" },
      { status: verified.status },
    );
  }

  const proGate = await assertPsychologyProFeature(session.user.id, professional.specialty);
  if (!proGate.ok) {
    return NextResponse.json({ error: proGate.code }, { status: 402 });
  }

  // Close any existing active session first
  await db.jitSession.updateMany({
    where: { professionalId: professional.id, status: { in: ["ONLINE", "PAUSED"] } },
    data: { status: "OFFLINE" },
  });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  let isFree = d.isFree;
  let priceAmount = d.isFree ? 0 : d.priceAmount;
  const jitEventId = d.jitEventId || null;
  const requestedIsFree = d.isFree;
  const requestedPriceAmount = d.isFree ? 0 : d.priceAmount;
  let forceFreeOverrode = false;

  if (jitEventId) {
    const jitEvent = await db.jitEvent.findUnique({ where: { id: jitEventId } });
    const now = new Date();
    const eventInvalid =
      !jitEvent ||
      !jitEvent.active ||
      jitEvent.startAt > now ||
      (jitEvent.endAt != null && jitEvent.endAt < now);

    if (eventInvalid) {
      return NextResponse.json({ error: "JIT_EVENT_INVALID" }, { status: 400 });
    }

    if (jitEvent.forceFree) {
      forceFreeOverrode = !requestedIsFree || requestedPriceAmount !== 0;
      isFree = true;
      priceAmount = 0;
    }
  }

  const jitSession = await db.jitSession.create({
    data: {
      professionalId:              professional.id,
      mode:                        d.mode,
      status:                      "ONLINE",
      specialty:                   d.specialty,
      isFree,
      priceAmount,
      currency:                    d.currency,
      maxQueueSize:                d.maxQueueSize,
      estimatedMinutesPerPatient:  d.estimatedMinutesPerPatient,
      jitEventId,
      lastHeartbeatAt:             new Date(),
    },
  });

  if (forceFreeOverrode) {
    console.log(
      `[JIT-FORCE-FREE] sessionId=${jitSession.id} eventId=${jitEventId} requested isFree=${requestedIsFree} priceAmount=${requestedPriceAmount}`,
    );
  }

  const { notifyFavoritePatientsOnline } = await import("@/lib/notify-favorites");
  notifyFavoritePatientsOnline(professional.id).catch(() => {});

  return NextResponse.json({ session: jitSession }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PROFESSIONAL")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
  });
  if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const activeSession = await db.jitSession.findFirst({
    where: { professionalId: professional.id, status: { in: ["ONLINE", "PAUSED"] } },
  });
  if (!activeSession)
    return NextResponse.json({ error: "No active session" }, { status: 404 });

  const wasPaused = activeSession.status === "PAUSED";
  const goingOnline = parsed.data.status === "ONLINE";

  const updated = await db.jitSession.update({
    where: { id: activeSession.id },
    data: {
      ...parsed.data,
      ...(parsed.data.status !== "OFFLINE" ? { lastHeartbeatAt: new Date() } : {}),
    },
    include: jitSessionInclude,
  });

  if (wasPaused && goingOnline) {
    const { notifyFavoritePatientsOnline } = await import("@/lib/notify-favorites");
    notifyFavoritePatientsOnline(professional.id).catch(() => {});
  }

  return NextResponse.json({ session: serializeJitSession(updated) });
}
