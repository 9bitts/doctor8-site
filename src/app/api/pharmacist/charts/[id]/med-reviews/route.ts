import { NextRequest, NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { medReviewBodySchema } from "@/lib/pharmacy/types";
import { requireChartAccess, requirePharmacistProfessional } from "@/lib/pharmacy/pharmacy-api";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePharmacistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, false, session.user.id);
  if ("error" in access) return access.error;

  const reviews = await db.pharmacyMedReview.findMany({
    where: { patientRecordId: params.id },
    orderBy: { reviewedAt: "desc" },
    take: 40,
  });

  return NextResponse.json({
    reviews: reviews.map((r) => ({
      id: r.id,
      medications: r.medications,
      problems: r.problems,
      recommendations: r.recommendations,
      adherenceNotes: r.adherenceNotes,
      followUpAt: r.followUpAt?.toISOString() ?? null,
      reviewedAt: r.reviewedAt.toISOString(),
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePharmacistProfessional();
  if ("error" in ctx) return ctx.error;
  const { professional, session } = ctx;

  const access = await requireChartAccess(professional.id, params.id, true, session.user.id);
  if ("error" in access) return access.error;

  const body = await req.json();
  const parsed = medReviewBodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const review = await db.pharmacyMedReview.create({
    data: {
      patientRecordId: params.id,
      professionalId: professional.id,
      medications: parsed.data.medications as Prisma.InputJsonValue,
      problems: parsed.data.problems as Prisma.InputJsonValue,
      recommendations: parsed.data.recommendations ?? null,
      adherenceNotes: parsed.data.adherenceNotes ?? null,
      followUpAt: parsed.data.followUpAt ? new Date(parsed.data.followUpAt) : null,
    },
  });

  return NextResponse.json(
    {
      id: review.id,
      reviewedAt: review.reviewedAt.toISOString(),
    },
    { status: 201 },
  );
}
