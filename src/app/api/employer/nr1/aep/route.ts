import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { refreshEmployerNr1Compliance } from "@/lib/employer-nr1";
import { db } from "@/lib/db";

const createSchema = z.object({
  title: z.string().min(2).max(200),
  methodology: z.string().optional(),
  methodologyRationale: z.string().optional(),
  workerParticipation: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(["DRAFT", "IN_PROGRESS", "COMPLETED", "APPROVED"]).optional(),
});

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const records = await db.employerAepRecord.findMany({
    where: { employerCompanyId: ctx.employerCompanyId },
    orderBy: { version: "desc" },
    include: { _count: { select: { riskEntries: true } } },
  });

  return NextResponse.json({ records });
}

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = createSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const last = await db.employerAepRecord.findFirst({
    where: { employerCompanyId: ctx.employerCompanyId },
    orderBy: { version: "desc" },
  });

  const record = await db.employerAepRecord.create({
    data: {
      employerCompanyId: ctx.employerCompanyId,
      title: parsed.data.title,
      version: (last?.version ?? 0) + 1,
      methodology: parsed.data.methodology ?? "COPSOQ-LITE + observação",
      methodologyRationale: parsed.data.methodologyRationale,
      workerParticipation: parsed.data.workerParticipation,
      notes: parsed.data.notes,
      status: parsed.data.status ?? "DRAFT",
      completedAt: parsed.data.status === "COMPLETED" || parsed.data.status === "APPROVED"
        ? new Date()
        : undefined,
    },
  });

  await refreshEmployerNr1Compliance(ctx.employerCompanyId);
  return NextResponse.json({ record }, { status: 201 });
}
