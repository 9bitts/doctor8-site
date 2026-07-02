// GET  — list patient favorites
// POST — add favorite { professionalId, notifyOnline? }
// DELETE — remove favorite ?professionalId=

import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { z } from "zod";

const postSchema = z.object({
  professionalId: z.string(),
  notifyOnline:   z.boolean().optional().default(true),
});

export async function GET() {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId } = ctx;

  const favorites = await db.patientFavorite.findMany({
    where: { patientUserId: userId },
    select: { professionalId: true, notifyOnline: true, createdAt: true },
  });

  return NextResponse.json({
    favorites: favorites.map((f) => ({
      professionalId: f.professionalId,
      notifyOnline:   f.notifyOnline,
    })),
  });
}

export async function POST(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId } = ctx;

  const body = await req.json();
  const parsed = postSchema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const pro = await db.professionalProfile.findUnique({
    where: { id: parsed.data.professionalId, verified: true },
  });
  if (!pro) return NextResponse.json({ error: "Professional not found" }, { status: 404 });

  const fav = await db.patientFavorite.upsert({
    where: {
      patientUserId_professionalId: {
        patientUserId:  userId,
        professionalId: parsed.data.professionalId,
      },
    },
    create: {
      patientUserId:  userId,
      professionalId: parsed.data.professionalId,
      notifyOnline:   parsed.data.notifyOnline,
    },
    update: { notifyOnline: parsed.data.notifyOnline },
  });

  return NextResponse.json({ ok: true, professionalId: fav.professionalId });
}

export async function DELETE(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;
  const { userId } = ctx;

  const professionalId = req.nextUrl.searchParams.get("professionalId");
  if (!professionalId)
    return NextResponse.json({ error: "professionalId required" }, { status: 400 });

  await db.patientFavorite.deleteMany({
    where: { patientUserId: userId, professionalId },
  });

  return NextResponse.json({ ok: true });
}
