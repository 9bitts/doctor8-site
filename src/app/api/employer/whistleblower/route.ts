import { NextRequest, NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { z } from "zod";

export async function GET() {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST", "HR"]);
  if ("error" in ctx) return ctx.error;

  const reports = await db.employerWhistleblowerReport.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    orderBy: { createdAt: "desc" },
    take: 100,
    select: {
      id: true,
      protocolCode: true,
      category: true,
      status: true,
      createdAt: true,
      updatedAt: true,
      internalNotes: true,
      description: true,
    },
  });

  return NextResponse.json({ reports });
}

const patchSchema = z.object({
  id: z.string(),
  status: z.enum(["OPEN", "IN_REVIEW", "RESOLVED", "ARCHIVED"]).optional(),
  internalNotes: z.string().max(5000).optional(),
});

export async function PATCH(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const existing = await db.employerWhistleblowerReport.findFirst({
    where: { id: parsed.data.id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const report = await db.employerWhistleblowerReport.update({
    where: { id: existing.id },
    data: {
      status: parsed.data.status,
      internalNotes: parsed.data.internalNotes,
    },
  });

  return NextResponse.json({ report });
}
