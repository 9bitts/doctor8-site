import { NextRequest, NextResponse } from "next/server";
import { requireOrganization } from "@/lib/organization-auth";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const ctx = await requireOrganization();
  if ("error" in ctx) return ctx.error;

  const responses = await db.organizationSurveyResponse.findMany({
    where: { organizationId: ctx.organizationId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const scores = responses.map((r) => r.score);
  const nps = scores.length === 0 ? 0 : calculateNps(scores);
  const avg = scores.length === 0 ? 0 : scores.reduce((a, b) => a + b, 0) / scores.length;

  const distribution = { promoters: 0, passives: 0, detractors: 0 };
  for (const s of scores) {
    if (s >= 9) distribution.promoters++;
    else if (s >= 7) distribution.passives++;
    else distribution.detractors++;
  }

  return NextResponse.json({
    nps,
    average: Math.round(avg * 10) / 10,
    total: scores.length,
    distribution,
    responses: responses.map((r) => ({
      id: r.id,
      patientName: r.patientName,
      score: r.score,
      comment: r.comment,
      createdAt: r.createdAt.toISOString(),
    })),
  });
}

function calculateNps(scores: number[]): number {
  if (scores.length === 0) return 0;
  const promoters = scores.filter((s) => s >= 9).length;
  const detractors = scores.filter((s) => s <= 6).length;
  return Math.round(((promoters - detractors) / scores.length) * 100);
}

const createSchema = z.object({
  score: z.number().int().min(0).max(10),
  patientName: z.string().optional(),
  comment: z.string().max(500).optional(),
  appointmentId: z.string().optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireOrganization(["OWNER", "ADMIN", "RECEPTIONIST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: "Invalid" }, { status: 400 });

  const survey = await db.organizationSurveyResponse.create({
    data: {
      organizationId: ctx.organizationId,
      score: parsed.data.score,
      patientName: parsed.data.patientName,
      comment: parsed.data.comment,
      appointmentId: parsed.data.appointmentId,
    },
  });

  return NextResponse.json({ id: survey.id }, { status: 201 });
}
