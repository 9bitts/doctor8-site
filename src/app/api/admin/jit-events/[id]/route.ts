// src/app/api/admin/jit-events/[id]/route.ts
// PATCH — update event (activate/deactivate, change settings)
// DELETE — deactivate event

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const patchSchema = z.object({
  active:      z.boolean().optional(),
  forceFree:   z.boolean().optional(),
  endAt:       z.string().optional().or(z.literal("")),
  specialties: z.array(z.string()).optional(),
  description: z.string().optional(),
});

async function requireAdmin() {
  const session = await auth();
  if (!session?.user) return null;
  if (session.user.role !== "ADMIN") return null;
  return session;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const event = await db.jitEvent.findUnique({ where: { id: params.id } });
  if (!event) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const updated = await db.jitEvent.update({
    where: { id: params.id },
    data: {
      ...(parsed.data.active      !== undefined ? { active:      parsed.data.active }      : {}),
      ...(parsed.data.forceFree   !== undefined ? { forceFree:   parsed.data.forceFree }   : {}),
      ...(parsed.data.specialties !== undefined ? { specialties: parsed.data.specialties } : {}),
      ...(parsed.data.description !== undefined ? { description: parsed.data.description } : {}),
      ...(parsed.data.endAt !== undefined
        ? { endAt: parsed.data.endAt ? new Date(parsed.data.endAt) : null }
        : {}),
    },
  });

  return NextResponse.json({ event: updated });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const session = await requireAdmin();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  await db.jitEvent.update({
    where: { id: params.id },
    data:  { active: false },
  });

  return NextResponse.json({ ok: true });
}
