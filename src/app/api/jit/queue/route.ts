// src/app/api/jit/queue/route.ts
// POST — patient joins the queue
// PATCH — professional calls next patient OR system expires no-show

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { hasTelemedicineTcle } from "@/lib/consent/telemedicine-tcle";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { decrypt } from "@/lib/encryption";
import { readJsonBody } from "@/lib/safe-json";

function safeDecrypt(v: string | null): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

import { stripe } from "@/lib/stripe";

const joinSchema = z.object({
  sessionId: z.string(),
  specialty:  z.string().min(1).max(100),
  paymentIntentId: z.string().optional(),
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
    // Professional checking full queue — must own the session (prevents IDOR
    // leaking patient names + video URLs of any session to any logged-in user).
    if (session.user.role !== "PROFESSIONAL")
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

    const professional = await db.professionalProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    if (!professional) return NextResponse.json({ error: "No profile" }, { status: 404 });

    const ownsSession = await db.jitSession.findFirst({
      where: { id: sessionId, professionalId: professional.id },
      select: { id: true },
    });
    if (!ownsSession)
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });

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

  const body = await readJsonBody(req);
  if (body === null)
    return NextResponse.json({ error: "INVALID_BODY", message: "Invalid request body." }, { status: 400 });
  const parsed = joinSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const { sessionId, specialty, paymentIntentId } = parsed.data;

  if (!(await hasTelemedicineTcle(session.user.id))) {
    return NextResponse.json(
      {
        error: "TCLE_REQUIRED",
        message: "Sign the telemedicine consent form before joining the queue.",
      },
      { status: 403 },
    );
  }

  const jitSession = await db.jitSession.findUnique({ where: { id: sessionId } });
  if (!jitSession || jitSession.status !== "ONLINE")
    return NextResponse.json({ error: "Session not available" }, { status: 404 });

  let verifiedPaymentId: string | undefined;
  if (!jitSession.isFree && jitSession.priceAmount > 0) {
    if (!paymentIntentId) {
      return NextResponse.json({ error: "Payment required" }, { status: 402 });
    }
    try {
      const intent = await stripe.paymentIntents.retrieve(paymentIntentId);
      if (intent.status !== "succeeded") {
        return NextResponse.json({ error: "Payment not completed" }, { status: 402 });
      }
      if (intent.amount !== jitSession.priceAmount) {
        return NextResponse.json({ error: "Payment amount mismatch" }, { status: 402 });
      }
      if (intent.metadata?.sessionId !== sessionId || intent.metadata?.userId !== session.user.id) {
        return NextResponse.json({ error: "Invalid payment" }, { status: 402 });
      }
      verifiedPaymentId = paymentIntentId;
    } catch {
      return NextResponse.json({ error: "Could not verify payment" }, { status: 402 });
    }
  } else if (paymentIntentId) {
    verifiedPaymentId = paymentIntentId;
  }

  // Check if patient is already in this queue
  const existing = await db.jitQueue.findFirst({
    where: {
      sessionId,
      patientUserId: session.user.id,
      status: { in: ["WAITING", "CALLED", "IN_PROGRESS"] },
    },
  });
  if (existing) return NextResponse.json({ entry: { id: existing.id, status: existing.status, position: existing.position } });

  // Check queue size limit and assign position atomically
  let entry;
  try {
    entry = await db.$transaction(
      async (tx) => {
        const currentCount = await tx.jitQueue.count({
          where: { sessionId, status: { in: ["WAITING", "CALLED"] } },
        });
        if (currentCount >= jitSession.maxQueueSize) {
          throw new Error("QUEUE_FULL");
        }

        const lastEntry = await tx.jitQueue.findFirst({
          where: { sessionId },
          orderBy: { position: "desc" },
          select: { position: true },
        });
        const position = (lastEntry?.position ?? 0) + 1;

        return tx.jitQueue.create({
          data: {
            sessionId,
            patientUserId: session.user.id,
            status: "WAITING",
            position,
            specialty,
            paymentId: verifiedPaymentId ?? null,
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
  } catch (e) {
    if (e instanceof Error && e.message === "QUEUE_FULL") {
      return NextResponse.json({ error: "Queue is full. Please try again later." }, { status: 429 });
    }
    throw e;
  }

  return NextResponse.json(
    { entry: { id: entry.id, status: entry.status, position: entry.position } },
    { status: 201 },
  );
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await readJsonBody(req);
  if (body === null)
    return NextResponse.json({ error: "INVALID_BODY", message: "Invalid request body." }, { status: 400 });
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
      const missedCopy = storedNotificationText("notif.jit.missed.title", "notif.jit.missed.body");
      await createNotification({
        userId: e.patientUserId,
        title: missedCopy.title,
        body: missedCopy.body,
        type: "system",
        data: {
          sessionId,
          titleKey: "notif.jit.missed.title",
          bodyKey: "notif.jit.missed.body",
        },
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
    const finishing = await db.jitQueue.findMany({
      where: { sessionId, status: "IN_PROGRESS" },
      select: { id: true },
    });
    await db.jitQueue.updateMany({
      where: { sessionId, status: "IN_PROGRESS" },
      data:  { status: "DONE", endedAt: now },
    });
    for (const entry of finishing) {
      try {
        const { tryStampForCompletedJitQueue } = await import("@/lib/club-stamps");
        await tryStampForCompletedJitQueue(entry.id);
      } catch (e) {
        console.error("[JIT] Club stamp failed:", e);
      }
    }

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
      const { createEphemeralRoom } = await import("@/lib/daily");
      const room = await createEphemeralRoom({ maxParticipants: 2 });
      meetingUrl = room?.url || "";
      meetingRoomId = room?.name || "";
    } catch { /* non-fatal — meeting URL stays empty */ }

    const expiresAt = new Date(now.getTime() + jitSession.noShowTimeoutSeconds * 1000);

    const claimed = await db.jitQueue.updateMany({
      where: { id: next.id, status: "WAITING" },
      data: {
        status: "CALLED",
        calledAt: now,
        expiresAt,
        meetingUrl: meetingUrl || null,
        meetingRoomId: meetingRoomId || null,
      },
    });
    if (claimed.count === 0) {
      return NextResponse.json({ called: null, message: "Patient was already called" });
    }

    const called = await db.jitQueue.findUnique({ where: { id: next.id } });
    if (!called) {
      return NextResponse.json({ called: null, message: "Queue is empty" });
    }

    // Notify patient
    const turnCopy = storedNotificationText("notif.jit.yourTurn.title", "notif.jit.yourTurn.body");
    await createNotification({
      userId: called.patientUserId,
      title: turnCopy.title,
      body: turnCopy.body,
      type: "message",
      data: {
        queueId: called.id,
        meetingUrl,
        sessionId,
        titleKey: "notif.jit.yourTurn.title",
        bodyKey: "notif.jit.yourTurn.body",
      },
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
