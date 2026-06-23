// POST — submit or update a review { professionalId, rating, comment? }
// Patient must have at least one COMPLETED appointment with the professional.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  professionalId: z.string(),
  rating:         z.number().int().min(1).max(5),
  comment:        z.string().max(1000).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const hadAppointment = await db.appointment.findFirst({
    where: {
      patientId: patient.id,
      professionalId: parsed.data.professionalId,
      status: "COMPLETED",
    },
  });
  if (!hadAppointment)
    return NextResponse.json({ error: "Review only after a completed consultation" }, { status: 403 });

  const review = await db.professionalReview.upsert({
    where: {
      patientUserId_professionalId: {
        patientUserId:  session.user.id,
        professionalId: parsed.data.professionalId,
      },
    },
    create: {
      patientUserId:  session.user.id,
      professionalId: parsed.data.professionalId,
      rating:         parsed.data.rating,
      comment:        parsed.data.comment,
    },
    update: {
      rating:  parsed.data.rating,
      comment: parsed.data.comment,
    },
  });

  return NextResponse.json({ ok: true, reviewId: review.id });
}
