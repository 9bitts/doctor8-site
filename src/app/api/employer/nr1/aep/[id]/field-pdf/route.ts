import { NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { buildAetFieldVisitPdf } from "@/lib/employer-aet-field-pdf";
import { db } from "@/lib/db";

export const runtime = "nodejs";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const { id } = await params;
  const record = await db.employerAepRecord.findFirst({
    where: { id, employerCompanyId: ctx.employerCompanyId },
    include: {
      employerCompany: { select: { nomeFantasia: true, cnpj: true } },
    },
  });
  if (!record) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (record.aetStatus !== "COMPLETED" && record.aetStatus !== "IN_FIELD") {
    return NextResponse.json(
      { error: "Inicie a visita em campo antes de exportar o PDF." },
      { status: 400 },
    );
  }

  const pdf = await buildAetFieldVisitPdf({
    companyName: record.employerCompany.nomeFantasia,
    cnpj: record.employerCompany.cnpj,
    aepTitle: record.title,
    aepVersion: record.version,
    workstationDescription: record.workstationDescription,
    fieldVisitJson: record.fieldVisitJson,
    photoKeys: record.photoKeys,
    aetFindings: record.aetFindings,
    aetRecommendations: record.aetRecommendations,
    evaluatorName: record.evaluatorName,
    evaluatorSignedAt: record.evaluatorSignedAt,
    aetCompletedAt: record.aetCompletedAt,
    aetStatus: record.aetStatus,
  });

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="visita-ergonomica-${id.slice(0, 8)}.pdf"`,
    },
  });
}
