import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { classifyEmployerRisk } from "@/lib/nr1-risk-matrix";
import { refreshEmployerNr1Compliance } from "@/lib/employer-nr1";
import { db } from "@/lib/db";

const patchSchema = z.object({
  processDescription: z.string().optional(),
  exposedGroups: z.string().optional(),
  possibleHarm: z.string().optional(),
  exposureCharacterization: z.string().optional(),
  existingControls: z.string().optional(),
  severity: z.number().int().min(1).max(5).optional(),
  probability: z.number().int().min(1).max(5).optional(),
});

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await db.employerRiskEntry.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const parsed = patchSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const severity = parsed.data.severity ?? existing.severity;
  const probability = parsed.data.probability ?? existing.probability;

  const entry = await db.employerRiskEntry.update({
    where: { id },
    data: {
      ...parsed.data,
      severity,
      probability,
      riskLevel: classifyEmployerRisk(severity, probability),
    },
  });

  await refreshEmployerNr1Compliance(ctx.employerCompanyId);
  return NextResponse.json({ entry });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const existing = await db.employerRiskEntry.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId },
  });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.employerRiskEntry.delete({ where: { id } });
  await refreshEmployerNr1Compliance(ctx.employerCompanyId);
  return NextResponse.json({ success: true });
}
