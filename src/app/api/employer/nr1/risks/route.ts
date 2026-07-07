import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { canManageNr1 } from "@/lib/employer-auth";
import { NR1_PSYCHOSOCIAL_HAZARDS, getNr1HazardByCode } from "@/lib/nr1-hazards";
import { classifyEmployerRisk } from "@/lib/nr1-risk-matrix";
import { refreshEmployerNr1Compliance } from "@/lib/employer-nr1";
import { db } from "@/lib/db";

const createSchema = z.object({
  hazardCode: z.string().min(1),
  processDescription: z.string().optional(),
  exposedGroups: z.string().optional(),
  possibleHarm: z.string().optional(),
  exposureCharacterization: z.string().optional(),
  existingControls: z.string().optional(),
  severity: z.number().int().min(1).max(5),
  probability: z.number().int().min(1).max(5),
  aepRecordId: z.string().optional(),
});

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const [entries, catalog] = await Promise.all([
    db.employerRiskEntry.findMany({
      where: { employerCompanyId: ctx.employerCompanyId },
      orderBy: [{ riskLevel: "desc" }, { hazardCode: "asc" }],
    }),
    Promise.resolve(NR1_PSYCHOSOCIAL_HAZARDS),
  ]);

  return NextResponse.json({ entries, catalog });
}

export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;
  if (!canManageNr1(ctx.memberRole) && ctx.memberRole !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = createSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const hazard = getNr1HazardByCode(parsed.data.hazardCode);
  if (!hazard) {
    return NextResponse.json({ error: "Invalid hazard code" }, { status: 400 });
  }

  const riskLevel = classifyEmployerRisk(parsed.data.severity, parsed.data.probability);

  const entry = await db.employerRiskEntry.create({
    data: {
      employerCompanyId: ctx.employerCompanyId,
      hazardCode: hazard.code,
      hazardLabel: hazard.labelPt,
      processDescription: parsed.data.processDescription,
      exposedGroups: parsed.data.exposedGroups,
      possibleHarm: parsed.data.possibleHarm ?? hazard.possibleHarm,
      exposureCharacterization: parsed.data.exposureCharacterization,
      existingControls: parsed.data.existingControls,
      severity: parsed.data.severity,
      probability: parsed.data.probability,
      riskLevel,
      aepRecordId: parsed.data.aepRecordId,
    },
  });

  await refreshEmployerNr1Compliance(ctx.employerCompanyId);
  return NextResponse.json({ entry }, { status: 201 });
}
