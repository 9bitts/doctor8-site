import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { requireEmployerApi } from "@/lib/api-auth";
import { buildEmployerDocumentPdf } from "@/lib/employer-document-icp";
import { isLacunaConfigured } from "@/lib/employer-integrations";
import { buildKey, uploadToS3 } from "@/lib/s3";
import { db } from "@/lib/db";

const demoSchema = z.object({
  docType: z.enum(["PGR_INVENTORY", "PCMSO", "ASO", "GRO_CRITERIA"]),
  docRefId: z.string().optional(),
  signedByName: z.string().min(2).max(200),
  signedByRegistro: z.string().max(50).optional(),
  signedByRole: z.enum(["MEDICO_TRABALHO", "SST", "ENG_SEGURANCA", "ADMIN"]),
  notes: z.string().max(1000).optional(),
});

export const runtime = "nodejs";
export const maxDuration = 60;

/** Assinatura demo: gera PDF com carimbo de demonstração (sem Lacuna/ICP). */
export async function POST(req: NextRequest) {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const parsed = demoSchema.safeParse(await req.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const built = await buildEmployerDocumentPdf(
    ctx.employerCompanyId,
    parsed.data.docType,
    parsed.data.docRefId,
  );
  if (!built) {
    return NextResponse.json({ error: "Document not available" }, { status: 404 });
  }

  const { PDFDocument, StandardFonts, rgb } = await import("pdf-lib");
  const doc = await PDFDocument.load(built.pdfBytes);
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  for (const page of doc.getPages()) {
    const { width, height } = page.getSize();
    page.drawText("DEMONSTRAÇÃO — SEM VALIDADE ICP-BRASIL", {
      x: 40,
      y: height - 40,
      size: 10,
      font,
      color: rgb(0.8, 0.2, 0.2),
    });
    page.drawText(`Assinado demo por ${parsed.data.signedByName}`, {
      x: 40,
      y: 30,
      size: 8,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(new Date().toLocaleString("pt-BR"), {
      x: width - 140,
      y: 30,
      size: 8,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
  }
  const pdfBytes = await doc.save();

  const signature = await db.employerDocumentSignature.create({
    data: {
      employerCompanyId: ctx.employerCompanyId,
      docType: parsed.data.docType,
      docRefId: parsed.data.docRefId,
      signedByName: parsed.data.signedByName,
      signedByRegistro: parsed.data.signedByRegistro,
      signedByRole: parsed.data.signedByRole,
      notes: parsed.data.notes ?? "Assinatura demonstração (sem ICP)",
      signatureStatus: "SIGNED",
      icpSerial: "DEMO-NO-ICP",
    },
  });

  const key = buildKey(
    `employer/${ctx.employerCompanyId}/signed-demo`,
    `${signature.docType}-${signature.id}.pdf`,
  );
  await uploadToS3({ key, body: Buffer.from(pdfBytes), contentType: "application/pdf" });

  await db.employerDocumentSignature.update({
    where: { id: signature.id },
    data: { signedPdfKey: key },
  });

  return NextResponse.json({
    signatureId: signature.id,
    mode: "demo",
    lacunaConfigured: isLacunaConfigured(),
    message: "PDF gerado em modo demonstração. Contrate Lacuna para assinatura ICP-Brasil com validade jurídica.",
    pdfUrl: `/api/employer/documents/sign/${signature.id}/pdf`,
  });
}
