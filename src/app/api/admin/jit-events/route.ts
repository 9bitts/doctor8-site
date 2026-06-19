// src/app/api/admin/jit-events/route.ts
// GET  — list all JIT events
// POST — create a new JIT event (emergency event like RS floods)

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const createSchema = z.object({
  name:        z.string().min(1).max(200),
  description: z.string().max(2000).optional().or(z.literal("")),
  startAt:     z.string(), // ISO date string
  endAt:       z.string().optional().or(z.literal("")),
  forceFree:   z.boolean().default(true),
  specialties: z.array(z.string()).default([]),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "ADMIN") return null;
  return session;
}

export async function GET() {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const events = await db.jitEvent.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { sessions: true } },
    },
  });

  return NextResponse.json({
    events: events.map((e) => ({
      id:           e.id,
      name:         e.name,
      description:  e.description,
      startAt:      e.startAt.toISOString(),
      endAt:        e.endAt?.toISOString() ?? null,
      forceFree:    e.forceFree,
      specialties:  e.specialties,
      active:       e.active,
      sessionCount: e._count.sessions,
      createdAt:    e.createdAt.toISOString(),
    })),
  });
}

export async function POST(req: NextRequest) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const d = parsed.data;

  const event = await db.jitEvent.create({
    data: {
      name:        d.name,
      description: d.description || null,
      startAt:     new Date(d.startAt),
      endAt:       d.endAt ? new Date(d.endAt) : null,
      forceFree:   d.forceFree,
      specialties: d.specialties,
      active:      true,
    },
  });

  return NextResponse.json({ event }, { status: 201 });
}
