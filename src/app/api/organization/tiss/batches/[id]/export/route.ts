import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { buildTissBatchXml } from "@/lib/tiss-export";

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requireOrganizationApi();
  if (isApiError(ctx)) return ctx.error;

  const batch = await db.tissBatch.findFirst({
    where: { id: params.id, organizationId: ctx.organizationId },
    include: {
      orgHealthPlan: true,
      guides: true,
      organization: { select: { cnpj: true, razaoSocial: true, nomeFantasia: true } },
    },
  });
  if (!batch) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const profIds = [...new Set(batch.guides.map((g) => g.professionalId))];
  const professionals = await db.professionalProfile.findMany({
    where: { id: { in: profIds } },
    select: { id: true, firstName: true, lastName: true, licenseNumber: true },
  });
  const profMap = new Map(professionals.map((p) => [p.id, p]));

  const xml = buildTissBatchXml({
    batchNumber: batch.batchNumber,
    operatorName: batch.orgHealthPlan.operatorName,
    ansRegistry: batch.orgHealthPlan.ansRegistry,
    contractNumber: batch.orgHealthPlan.contractNumber,
    providerCnpj: batch.organization.cnpj,
    providerName: batch.organization.nomeFantasia,
    periodStart: batch.periodStart,
    periodEnd: batch.periodEnd,
    tissVersion: batch.orgHealthPlan.tissVersion,
    guides: batch.guides.map((g) => {
      const prof = profMap.get(g.professionalId);
      return {
        guideNumber: g.guideNumber || g.id,
        procedureCode: g.procedureCode,
        procedureName: g.procedureName,
        amountCents: g.amountCents,
        patientName: g.patientName,
        patientCpf: g.patientCpf,
        cardNumber: g.cardNumber,
        serviceDate: g.serviceDate,
        professionalName: prof ? `${prof.firstName} ${prof.lastName}` : "Profissional",
        professionalCrm: prof?.licenseNumber,
      };
    }),
  });

  await db.tissBatch.update({
    where: { id: batch.id },
    data: { status: "SENT", sentAt: new Date() },
  });

  return new NextResponse(xml, {
    headers: {
      "Content-Type": "application/xml; charset=utf-8",
      "Content-Disposition": `attachment; filename="tiss-lote-${batch.batchNumber}.xml"`,
    },
  });
}
