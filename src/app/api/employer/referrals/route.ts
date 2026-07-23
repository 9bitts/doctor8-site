import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { createCareReferral } from "@/lib/employer-care-referrals";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const referrals = await db.employerCareReferral.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    include: {
      workforceMember: {
        select: { id: true, firstName: true, lastName: true, email: true, department: true },
      },
    },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    take: 200,
  });

  return NextResponse.json({ referrals });
}

const createSchema = z.object({
  workforceMemberId: z.string().optional().nullable(),
  source: z.enum(["SCREENING", "RISK", "CID_F", "PAIN_COMPLAINT", "MANUAL", "AET_FLAG"]),
  target: z.enum(["EAP", "AET", "ERGONOMIST", "PHYSICIAN"]),
  reason: z.string().min(3).max(4000),
  notes: z.string().max(4000).optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST", "HR"]);
  if ("error" in ctx) return ctx.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const result = await createCareReferral({
    employerCompanyId: ctx.employerCompanyId,
    workforceMemberId: parsed.data.workforceMemberId,
    source: parsed.data.source,
    target: parsed.data.target,
    reason: parsed.data.reason,
    notes: parsed.data.notes,
  });

  return NextResponse.json(result, { status: result.created ? 201 : 200 });
}

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["OPEN", "IN_PROGRESS", "CLOSED", "DISMISSED"]),
  notes: z.string().max(4000).optional(),
});

export async function PATCH(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST", "HR"]);
  if ("error" in ctx) return ctx.error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.employerCareReferral.findFirst({
    where: { id: parsed.data.id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const closed = parsed.data.status === "CLOSED" || parsed.data.status === "DISMISSED";
  const referral = await db.employerCareReferral.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      notes: parsed.data.notes,
      closedAt: closed ? new Date() : null,
    },
  });

  return NextResponse.json({ referral });
}
