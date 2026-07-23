import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { assertWorkforceCapacity } from "@/lib/employer-plan-enforcement";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const members = await db.employerWorkforceMember.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    orderBy: { lastName: "asc" },
  });

  return NextResponse.json({ members });
}

const createSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  department: z.string().optional(),
  jobTitle: z.string().optional(),
  gheGroupId: z.string().optional().nullable(),
  sectorId: z.string().optional().nullable(),
  jobFunctionId: z.string().optional().nullable(),
  sessionsQuota: z.number().int().min(0).max(100).optional(),
});

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "HR", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  const existingMember = await db.employerWorkforceMember.findUnique({
    where: {
      employerCompanyId_email: {
        employerCompanyId: ctx.employerCompanyId,
        email,
      },
    },
    select: { id: true },
  });

  if (!existingMember) {
    const capacity = await assertWorkforceCapacity(ctx.employerCompanyId);
    if (!capacity.ok) {
      return NextResponse.json(
        {
          error: "WORKFORCE_LIMIT",
          message: `Limite do plano (${capacity.limits.tier}): ${capacity.limits.maxWorkforce} colaboradores.`,
          current: capacity.current,
          max: capacity.limits.maxWorkforce,
        },
        { status: 400 },
      );
    }
  }

  const member = await db.employerWorkforceMember.upsert({
    where: {
      employerCompanyId_email: {
        employerCompanyId: ctx.employerCompanyId,
        email,
      },
    },
    create: {
      employerCompanyId: ctx.employerCompanyId,
      email,
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      department: parsed.data.department,
      jobTitle: parsed.data.jobTitle,
      gheGroupId: parsed.data.gheGroupId ?? null,
      sectorId: parsed.data.sectorId ?? null,
      jobFunctionId: parsed.data.jobFunctionId ?? null,
      sessionsQuota: parsed.data.sessionsQuota,
      status: "INVITED",
    },
    update: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      department: parsed.data.department,
      jobTitle: parsed.data.jobTitle,
      gheGroupId: parsed.data.gheGroupId === undefined ? undefined : parsed.data.gheGroupId,
      sectorId: parsed.data.sectorId === undefined ? undefined : parsed.data.sectorId,
      jobFunctionId: parsed.data.jobFunctionId === undefined ? undefined : parsed.data.jobFunctionId,
      sessionsQuota: parsed.data.sessionsQuota,
    },
  });

  if (!existingMember) {
    import("@/lib/employer-webhooks").then(({ dispatchEmployerWebhooks }) =>
      dispatchEmployerWebhooks(ctx.employerCompanyId, "workforce.member.added", {
        email: member.email,
        firstName: member.firstName,
        lastName: member.lastName,
        status: member.status,
      }).catch(() => {}),
    );
  }

  return NextResponse.json({ member }, { status: 201 });
}
