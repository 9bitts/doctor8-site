// src/app/api/jit/queue/route.ts
// POST — patient joins the queue
// PATCH — professional calls next patient OR system expires no-show

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { createNotification } from "@/lib/notifications";
import { decrypt } from "@/lib/encryption";

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

const joinSchema = z.object({
  sessionId: z.string(),
  specialty:  z.string().min(1).max(100),
});

const callSchema = z.object({
  action:     z.enum(["CALL_NEXT", "EXPIRE_NOSHOWS"]),
  sessionId:  z.string(),
  queueId:    z.string().optional(), // for CALL_NEXT if professional picks specific
});

// GET — patient polls their queue position
export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const queueId = searchParams.get("queueId");
  const sessionId = searchParams.get("sessionId");

  if (queueId) {
    // Patient checking their own entry
    const entry = await db.jitQueue.findUnique({
      where: { id: queueId },
      include: {
        session: {
          select: {
            estimatedMinutesPerPatient: true,
            status: true,
            professional: { select: { id: true, userId: true, firstName: true, lastName: true, specialty: true } },
          },
        },
      },
    });
    if (!entry) return NextResponse.json({ error: "Not found" }, { status: 404 });
    if (entry.patientUserId !== session.user.id)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    // Count people ahead
    const aheadCount = await db.jitQueue.count({
      where: {
        sessionId: entry.sessionId,
        status:    "WAITING",
        position:  { lt: entry.position },
      },
    });

    const estimatedWaitMinutes = aheadCount * (entry.session.estimatedMinutesPerPatient ?? 20);

    return NextResponse.json({
      entry: {
        id:                    entry.id,
        status:                entry.status,
        position:              entry.position,
        aheadCount,
        estimatedWaitMinutes,
        calledAt:              entry.calledAt?.toISOString() ?? null,
        expiresAt:             entry.expiresAt?.toISOString() ?? null,
        meetingUrl:            entry.meetingUrl ?? null,
        sessionStatus:         entry.session.status,
        professionalName:      `Dr. ${entry.session.professional.firstName} ${entry.session.professional.lastName}`,
        professionalId:        entry.session.professional.id,
        professionalUserId:    entry.session.professional.userId,
        specialty:             entry.session.professional.specialty,
      },
    });
  }

  if (sessionId) {
    // Professional checking full queue
    const entries = await db.jitQueue.findMany({
      where: {
        sessionId,
        status: { in: ["WAITING", "CALLED", "IN_PROGRESS"] },
      },
      orderBy: { position: "asc" },
      include: {
        patientUser: {
          select: {
            id: true,
            patientProfile: { select: { firstName: true, lastName: true } },
          },
        },
      },
    });

    return NextResponse.json({
      queue: entries.map((e) => ({
        id:          e.id,
        status:      e.status,
        position:    e.position,
        specialty:   e.specialty,
        enteredAt:   e.enteredAt.toISOString(),
        calledAt:    e.calledAt?.toISOString() ?? null,
        expiresAt:   e.expiresAt?.toISOString() ?? null,
        meetingUrl:  e.meetingUrl ?? null,
        patientName: e.patientUser?.patientProfile
          ? `${safeDecrypt(e.patientUser.patientProfile.firstName)} ${safeDecrypt(e.patientUser.patientProfile.lastName)}`.trim()
          : "Paciente",
      })),
    });
  }

  return NextResponse.json({ error: "sessionId or queueId required" }, { status: 400 });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT")
    return NextResponse.json({ error: "Only patients can join the queue" }, { status: 403 });

  const body = await req.json();
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { sessionId, specialty } = parsed.data;

  const jitSession = await db.jitSession.findUnique({ where: { id: sessionId } });
  if (!jitSession || jitSession.status !== "ONLINE")
    return NextResponse.json({ error: "Session not available" }, { status: 404 });

  // Check if patient is already in this queue
  const existing = await db.jitQueue.findFirst({
    where: {
      sessionId,
      patientUserId: session.user.id,
      status: { in: ["WAITING", "CALLED", "IN_PROGRESS"] },
    },
  });
  if (existing) return NextResponse.json({ entry: { id: existing.id, status: existing.status, position: existing.position } });

  // Check queue size limit
  const currentCount = await db.jitQueue.count({
    where: { sessionId, status: { in: ["WAITING", "CALLED"] } },
  });
  if (currentCount >= jitSession.maxQueueSize)
    return NextResponse.json({ error: "Queue is full. Please try again later." }, { status: 429 });

  // Get next position
  const lastEntry = await db.jitQueue.findFirst({
    where: { sessionId },
    orderBy: { position: "desc" },
  });
  const position = (lastEntry?.position ?? 0) + 1;

  const entry = await db.jitQueue.create({
    data: {
      sessionId,
      patientUserId: session.user.id,
      status:        "WAITING",
      position,
      specialty,
    },
  });

  return NextResponse.json({ entry: { id: entry.id, status: entry.status, position: entry.position } }, { status: 201 });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = callSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { action, sessionId } = parsed.data;

  // ── EXPIRE_NOSHOWS: called by the professional's dashboard polling ──
  if (action === "EXPIRE_NOSHOWS") {
    // Only the professional who owns this session may expire its no-shows.
    if (session.user.role !== "PROFESSIONAL")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const professional = await db.professionalProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

    const ownsSession = await db.jitSession.findFirst({
      where: { id: sessionId, professionalId: professional.id },
      select: { id: true },
    });
    if (!ownsSession)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    const now = new Date();
    const expired = await db.jitQueue.findMany({
      where: {
        sessionId,
        status:    "CALLED",
        expiresAt: { lt: now },
      },
    });

    for (const e of expired) {
      await db.jitQueue.update({
        where: { id: e.id },
        data:  { status: "NO_SHOW", endedAt: now },
      });
      // Notify patient
      await createNotification({
        userId: e.patientUserId,
        title:  "Você perdeu sua vez",
        body:   "Você não entrou na consulta a tempo. Se ainda precisar de atendimento, entre na fila novamente.",
        type:   "system",
        data:   { sessionId },
      }).catch(() => {});
    }

    return NextResponse.json({ expired: expired.length });
  }

  // ── CALL_NEXT: professional calls the next patient ──
  if (action === "CALL_NEXT") {
    if (session.user.role !== "PROFESSIONAL")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const professional = await db.professionalProfile.findUnique({
      where: { userId: session.user.id },
    });
    if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

    const jitSession = await db.jitSession.findUnique({ where: { id: sessionId } });
    if (!jitSession || jitSession.professionalId !== professional.id)
      return NextResponse.json({ error: "Session not found" }, { status: 404 });

    // First expire any no-shows
    const now = new Date();
    await db.jitQueue.updateMany({
      where: { sessionId, status: "CALLED", expiresAt: { lt: now } },
      data:  { status: "NO_SHOW", endedAt: now },
    });

    // Mark current IN_PROGRESS as DONE
    await db.jitQueue.updateMany({
      where: { sessionId, status: "IN_PROGRESS" },
      data:  { status: "DONE", endedAt: now },
    });

    // Get next WAITING entry
    const next = await db.jitQueue.findFirst({
      where:   { sessionId, status: "WAITING" },
      orderBy: { position: "asc" },
    });

    if (!next) return NextResponse.json({ called: null, message: "Queue is empty" });

    // Create Daily.co room
    let meetingUrl = "";
    let meetingRoomId = "";
    try {
      const dailyRes = await fetch("https://api.daily.co/v1/rooms", {
        method:  "POST",
        headers: {
          "Content-Type":  "application/json",
          "Authorization": `Bearer ${process.env.DAILY_API_KEY}`,
        },
        body: JSON.stringify({
          properties: {
            exp:            Math.floor(Date.now() / 1000) + 7200, // 2h
            enable_chat:    true,
            enable_knocking: false,
          },
        }),
      });
      const room = await dailyRes.json();
      meetingUrl    = room.url || "";
      meetingRoomId = room.name || "";
    } catch { /* non-fatal — meeting URL stays empty */ }

    const expiresAt = new Date(now.getTime() + jitSession.noShowTimeoutSeconds * 1000);

    const called = await db.jitQueue.update({
      where: { id: next.id },
      data:  {
        status:      "CALLED",
        calledAt:    now,
        expiresAt,
        meetingUrl:  meetingUrl || null,
        meetingRoomId: meetingRoomId || null,
      },
    });

    // Notify patient
    await createNotification({
      userId: called.patientUserId,
      title:  "É a sua vez!",
      body:   "O médico está pronto para te atender. Você tem 2 minutos para entrar na consulta.",
      type:   "message",
      data:   { queueId: called.id, meetingUrl, sessionId },
    }).catch(() => {});

    return NextResponse.json({
      called: {
        id:         called.id,
        status:     called.status,
        position:   called.position,
        calledAt:   called.calledAt?.toISOString(),
        expiresAt:  called.expiresAt?.toISOString(),
        meetingUrl: called.meetingUrl,
      },
    });
  }

  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}
