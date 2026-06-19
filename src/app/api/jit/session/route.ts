// src/app/api/jit/session/route.ts
// GET  — get current professional's active JIT session (if any)
// POST — create/open a new JIT session (go online)
// PATCH — update session status (pause, go offline) or settings

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

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
        ? `${q.patientUser.patientProfile.firstName} ${q.patientUser.patientProfile.lastName}`.trim()
        : "Paciente",
    })),
  };
}

const jitSessionInclude = {
  _count: {
    select: {
      queue: { where: { status: { in: ["WAITING", "CALLED"] } } },
    },
  },
  queue: {
    where: { status: { in: ["WAITING", "CALLED", "IN_PROGRESS"] } },
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

  const jitSession = await db.jitSession.create({
    data: {
      professionalId:              professional.id,
      mode:                        d.mode,
      status:                      "ONLINE",
      specialty:                   d.specialty,
      isFree:                      d.isFree,
      priceAmount:                 d.isFree ? 0 : d.priceAmount,
      currency:                    d.currency,
      maxQueueSize:                d.maxQueueSize,
      estimatedMinutesPerPatient:  d.estimatedMinutesPerPatient,
      jitEventId:                  d.jitEventId || null,
    },
  });

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

  const updated = await db.jitSession.update({
    where: { id: activeSession.id },
    data: parsed.data,
    include: jitSessionInclude,
  });

  return NextResponse.json({ session: serializeJitSession(updated) });
}
