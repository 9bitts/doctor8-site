import { NextRequest, NextResponse } from "next/server";
import { requireOrganizationApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { buildTissBatchXml } from "@/lib/tiss-export";
import { formatLicense, getProfessionInfo } from "@/lib/profession-label";
import { decryptPhiField } from "@/lib/phi-field-crypto";

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
    select: { id: true, firstName: true, lastName: true, licenseNumber: true, licenseState: true, specialty: true },
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
      const council = prof ? getProfessionInfo(prof.specialty).councilKey : "crm";
      return {
        guideNumber: g.guideNumber || g.id,
        guideType: g.guideType,
        procedureCode: g.procedureCode,
        procedureName: g.procedureName,
        amountCents: g.amountCents,
        patientName: decryptPhiField(g.patientName) ?? "",
        patientCpf: decryptPhiField(g.patientCpf),
        cardNumber: decryptPhiField(g.cardNumber),
        serviceDate: g.serviceDate,
        professionalName: prof ? `${prof.firstName} ${prof.lastName}` : "Profissional",
        professionalCouncilNumber: prof?.licenseNumber
          ? formatLicense(prof.licenseNumber, prof.licenseState, council)
          : null,
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
