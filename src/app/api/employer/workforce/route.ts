import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
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
      sessionsQuota: parsed.data.sessionsQuota,
      status: "INVITED",
    },
    update: {
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      department: parsed.data.department,
      jobTitle: parsed.data.jobTitle,
      sessionsQuota: parsed.data.sessionsQuota,
    },
  });

  return NextResponse.json({ member }, { status: 201 });
}
