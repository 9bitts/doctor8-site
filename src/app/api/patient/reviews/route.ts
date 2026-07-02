// POST — submit or update a review
// Patient must have at least one COMPLETED appointment with the provider.

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";

const schema = z.object({
  professionalId: z.string().optional(),
  psychoanalystId: z.string().optional(),
  providerType: z.enum(["health", "psychoanalyst"]).optional(),
  rating: z.number().int().min(1).max(5),
  comment: z.string().max(1000).optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const [professionalReviews, psychoanalystReviews] = await Promise.all([
    db.professionalReview.findMany({
      where: { patientUserId: session.user.id },
      select: { professionalId: true },
    }),
    db.psychoanalystReview.findMany({
      where: { patientUserId: session.user.id },
      select: { psychoanalystId: true },
    }),
  ]);

  return NextResponse.json({
    professionalIds: professionalReviews.map((r) => r.professionalId),
    psychoanalystIds: psychoanalystReviews.map((r) => r.psychoanalystId),
  });
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "PATIENT")
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const body = await req.json();
  const parsed = schema.safeParse(body);
  if (!parsed.success)
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });

  const providerType =
    parsed.data.providerType ??
    (parsed.data.psychoanalystId ? "psychoanalyst" : "health");
  const providerId =
    providerType === "psychoanalyst"
      ? parsed.data.psychoanalystId || parsed.data.professionalId
      : parsed.data.professionalId || parsed.data.psychoanalystId;

  if (!providerId) {
    return NextResponse.json({ error: "Provider not specified" }, { status: 400 });
  }

  const patient = await db.patientProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });
  if (!patient) return NextResponse.json({ error: "Patient not found" }, { status: 404 });

  const hadAppointment = await db.appointment.findFirst({
    where: {
      patientId: patient.id,
      status: "COMPLETED",
      ...(providerType === "psychoanalyst"
        ? { psychoanalystId: providerId }
        : { professionalId: providerId }),
    },
  });
  if (!hadAppointment)
    return NextResponse.json({ error: "Review only after a completed consultation" }, { status: 403 });

  if (providerType === "psychoanalyst") {
    const review = await db.psychoanalystReview.upsert({
      where: {
        patientUserId_psychoanalystId: {
          patientUserId: session.user.id,
          psychoanalystId: providerId,
        },
      },
      create: {
        patientUserId: session.user.id,
        psychoanalystId: providerId,
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      },
      update: {
        rating: parsed.data.rating,
        comment: parsed.data.comment,
      },
    });
    return NextResponse.json({ ok: true, reviewId: review.id });
  }

  const review = await db.professionalReview.upsert({
    where: {
      patientUserId_professionalId: {
        patientUserId: session.user.id,
        professionalId: providerId,
      },
    },
    create: {
      patientUserId: session.user.id,
      professionalId: providerId,
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
    update: {
      rating: parsed.data.rating,
      comment: parsed.data.comment,
    },
  });

  return NextResponse.json({ ok: true, reviewId: review.id });
}
