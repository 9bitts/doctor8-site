import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";

const pulseSchema = z.object({
  token: z.string().optional(),
  companySlug: z.string().optional(),
  moodScore: z.number().int().min(1).max(5),
  moodReason: z.string().max(200).optional(),
  department: z.string().max(100).optional(),
});

export async function POST(req: NextRequest) {
  const parsed = pulseSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  let employerCompanyId: string | null = null;

  if (parsed.data.companySlug) {
    const company = await db.employerCompany.findUnique({
      where: { slug: parsed.data.companySlug },
      select: { id: true },
    });
    employerCompanyId = company?.id ?? null;
  }

  if (!employerCompanyId && parsed.data.token) {
    const member = await db.employerWorkforceMember.findFirst({
      where: { inviteToken: parsed.data.token, status: "ACTIVE" },
      select: { employerCompanyId: true },
    });
    employerCompanyId = member?.employerCompanyId ?? null;
  }

  if (!employerCompanyId) {
    return NextResponse.json({ error: "Invalid context" }, { status: 400 });
  }

  await db.employerWellnessPulse.create({
    data: {
      employerCompanyId,
      moodScore: parsed.data.moodScore,
      moodReason: parsed.data.moodReason?.trim() || null,
      department: parsed.data.department?.trim() || null,
    },
  });

  return NextResponse.json({ success: true });
}
