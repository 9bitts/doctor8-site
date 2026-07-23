import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { requireEmployerApi } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { parseExamMatrix } from "@/lib/employer-pcmso-exam-matrix";
import { buildMatrixRowFromGhe } from "@/lib/employer-pcmso-generate";

/** Rebuild PCMSO exam matrix rows from GHE + linked risk hazard codes. */
export async function POST() {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST", "HR"]);
  if ("error" in ctx) return ctx.error;

  const [groups, risks, config] = await Promise.all([
    db.employerGheGroup.findMany({
      where: { employerCompanyId: ctx.employerCompanyId },
      include: {
        sectorRef: { select: { name: true } },
        jobFunction: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    db.employerRiskEntry.findMany({
      where: { employerCompanyId: ctx.employerCompanyId },
      select: { gheGroupId: true, hazardCode: true },
    }),
    db.employerPcmsoConfig.findUnique({
      where: { employerCompanyId: ctx.employerCompanyId },
    }),
  ]);

  const existing = parseExamMatrix(config?.examMatrixJson);
  const existingByGhe = new Map(
    existing
      .filter((r) => r.gheGroupId)
      .map((r) => [r.gheGroupId!, r]),
  );
  const existingByName = new Map(existing.map((r) => [r.gheName.toLowerCase(), r]));

  const codesByGhe = new Map<string, string[]>();
  for (const r of risks) {
    if (!r.gheGroupId) continue;
    const list = codesByGhe.get(r.gheGroupId) ?? [];
    if (!list.includes(r.hazardCode)) list.push(r.hazardCode);
    codesByGhe.set(r.gheGroupId, list);
  }

  const rows = groups.map((g) => {
    const fromJson = Array.isArray(g.hazardCodes) ? (g.hazardCodes as string[]) : [];
    const fromRisks = codesByGhe.get(g.id) ?? [];
    const hazardCodes = Array.from(new Set([...fromJson, ...fromRisks]));
    const prev = existingByGhe.get(g.id) || existingByName.get(g.name.toLowerCase()) || null;
    return buildMatrixRowFromGhe({
      gheId: g.id,
      gheName: g.name,
      sector: g.sectorRef?.name || g.sector || "",
      functionName: g.jobFunction?.name || g.functions || "",
      hazardCodes,
      existing: prev,
    });
  });

  const matrix = rows.length > 0 ? rows : existing;

  const saved = await db.employerPcmsoConfig.upsert({
    where: { employerCompanyId: ctx.employerCompanyId },
    create: {
      employerCompanyId: ctx.employerCompanyId,
      examMatrixJson: matrix as unknown as Prisma.InputJsonValue,
    },
    update: {
      examMatrixJson: matrix as unknown as Prisma.InputJsonValue,
    },
  });

  return NextResponse.json({
    examMatrix: matrix,
    configId: saved.id,
    gheCount: groups.length,
  });
}
