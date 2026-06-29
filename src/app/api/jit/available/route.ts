// src/app/api/jit/available/route.ts
// GET — list professionals currently ONLINE with their active JIT session
// Used by patients to see who's available now

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { activeOnlineJitSessionWhere, expireStaleJitSessions } from "@/lib/jit-session-lifecycle";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await expireStaleJitSessions();

  const { searchParams } = new URL(req.url);
  const specialty = searchParams.get("specialty"); // optional filter

  const sessions = await db.jitSession.findMany({
    where: {
      ...activeOnlineJitSessionWhere(),
      ...(specialty ? { specialty: { contains: specialty, mode: "insensitive" } } : {}),
    },
    include: {
      professional: {
        select: {
          id:        true,
          firstName: true,
          lastName:  true,
          specialty: true,
          avatarUrl: true,
          bio:       true,
        },
      },
      _count: {
        select: {
          queue: { where: { status: { in: ["WAITING", "CALLED"] } } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return NextResponse.json({
    available: sessions.map((s) => ({
      sessionId:                   s.id,
      mode:                        s.mode,
      specialty:                   s.specialty,
      isFree:                      s.isFree,
      priceAmount:                 s.priceAmount,
      currency:                    s.currency,
      queueCount:                  s._count.queue,
      estimatedWaitMinutes:        s._count.queue * s.estimatedMinutesPerPatient,
      maxQueueSize:                s.maxQueueSize,
      isFull:                      s._count.queue >= s.maxQueueSize,
      professional: {
        id:        s.professional.id,
        name:      `Dr. ${s.professional.firstName} ${s.professional.lastName}`,
        specialty: s.professional.specialty,
        avatarUrl: s.professional.avatarUrl ?? null,
        bio:       s.professional.bio ?? null,
      },
    })),
  });
}
