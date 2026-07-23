import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { canManageNr1 } from "@/lib/employer-auth";
import {
  EMPLOYER_RISK_CATALOG,
  RISK_CATEGORY_LABELS,
  EXPOSURE_TYPE_OPTIONS,
  QUALITATIVE_LEVELS,
  getRiskCatalogItem,
  type EmployerRiskCategoryCode,
} from "@/lib/employer-risk-catalog";
import { getNr1HazardByCode } from "@/lib/nr1-hazards";
import { classifyEmployerRisk } from "@/lib/nr1-risk-matrix";
import { refreshEmployerNr1Compliance } from "@/lib/employer-nr1";
import { db } from "@/lib/db";

const createSchema = z.object({
  hazardCode: z.string().min(1),
  riskCategory: z
    .enum(["FISICO", "QUIMICO", "BIOLOGICO", "ACIDENTE", "ERGONOMICO", "PSICOSSOCIAL"])
    .optional(),
  agent: z.string().max(300).optional(),
  processDescription: z.string().optional(),
  exposedGroups: z.string().optional(),
  possibleHarm: z.string().optional(),
  exposureCharacterization: z.string().optional(),
  exposureType: z.string().max(100).optional(),
  exposureLevel: z.string().max(100).optional(),
  toleranceLimit: z.string().max(100).optional(),
  existingControls: z.string().optional(),
  severity: z.number().int().min(1).max(5),
  probability: z.number().int().min(1).max(5),
  aepRecordId: z.string().optional(),
  gheGroupId: z.string().optional().nullable(),
});

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const [entries, gheGroups] = await Promise.all([
    db.employerRiskEntry.findMany({
      where: { employerCompanyId: ctx.employerCompanyId },
      include: {
        gheGroup: { select: { id: true, name: true, sector: true } },
      },
      orderBy: [{ riskLevel: "desc" }, { riskCategory: "asc" }, { hazardCode: "asc" }],
    }),
    db.employerGheGroup.findMany({
      where: { employerCompanyId: ctx.employerCompanyId },
      select: { id: true, name: true, sector: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return NextResponse.json({
    entries,
    catalog: EMPLOYER_RISK_CATALOG,
    categoryLabels: RISK_CATEGORY_LABELS,
    exposureTypes: EXPOSURE_TYPE_OPTIONS,
    qualitativeLevels: QUALITATIVE_LEVELS,
    gheGroups,
  });
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

  const catalogItem = getRiskCatalogItem(parsed.data.hazardCode);
  const psycho = getNr1HazardByCode(parsed.data.hazardCode);

  if (!catalogItem && !psycho) {
    return NextResponse.json({ error: "Invalid hazard code" }, { status: 400 });
  }

  const riskCategory = (parsed.data.riskCategory ||
    catalogItem?.category ||
    "PSICOSSOCIAL") as EmployerRiskCategoryCode;

  if (parsed.data.gheGroupId) {
    const ghe = await db.employerGheGroup.findFirst({
      where: { id: parsed.data.gheGroupId, employerCompanyId: ctx.employerCompanyId },
    });
    if (!ghe) return NextResponse.json({ error: "GHE inválido" }, { status: 400 });
  }

  const riskLevel = classifyEmployerRisk(parsed.data.severity, parsed.data.probability);
  const label = catalogItem?.labelPt || psycho?.labelPt || parsed.data.hazardCode;
  const agent = parsed.data.agent || catalogItem?.agent || label;

  const entry = await db.employerRiskEntry.create({
    data: {
      employerCompanyId: ctx.employerCompanyId,
      hazardCode: parsed.data.hazardCode,
      hazardLabel: label,
      riskCategory,
      agent,
      processDescription: parsed.data.processDescription,
      exposedGroups: parsed.data.exposedGroups,
      possibleHarm: parsed.data.possibleHarm ?? catalogItem?.possibleHarm ?? psycho?.possibleHarm,
      exposureCharacterization: parsed.data.exposureCharacterization,
      exposureType: parsed.data.exposureType,
      exposureLevel: parsed.data.exposureLevel,
      toleranceLimit: parsed.data.toleranceLimit ?? catalogItem?.defaultToleranceLimit,
      existingControls: parsed.data.existingControls,
      severity: parsed.data.severity,
      probability: parsed.data.probability,
      riskLevel,
      aepRecordId: parsed.data.aepRecordId,
      gheGroupId: parsed.data.gheGroupId ?? null,
    },
  });

  // Keep GHE hazardCodes in sync for PCMSO suggestions
  if (parsed.data.gheGroupId) {
    const ghe = await db.employerGheGroup.findUnique({
      where: { id: parsed.data.gheGroupId },
      select: { hazardCodes: true },
    });
    const codes = Array.isArray(ghe?.hazardCodes)
      ? (ghe!.hazardCodes as string[])
      : [];
    if (!codes.includes(parsed.data.hazardCode)) {
      await db.employerGheGroup.update({
        where: { id: parsed.data.gheGroupId },
        data: { hazardCodes: [...codes, parsed.data.hazardCode] },
      });
    }
  }

  await refreshEmployerNr1Compliance(ctx.employerCompanyId);
  return NextResponse.json({ entry }, { status: 201 });
}
