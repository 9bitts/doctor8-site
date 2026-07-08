import { NextRequest, NextResponse } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { ensurePrescriptionToken, prescriptionQrUrl } from "@/lib/pharmacy-network/prescription-token";
import { generateQrPngBuffer } from "@/lib/qr-png";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const { id } = await params;
  const rx = await db.prescription.findFirst({
    where: {
      id,
      document: { patientId: ctx.patientProfileId },
    },
  });
  if (!rx || rx.signatureStatus !== "SIGNED") {
    return NextResponse.json({ error: "Receita não encontrada" }, { status: 404 });
  }

  const tokenRow = await ensurePrescriptionToken(rx.id);
  const url = prescriptionQrUrl(tokenRow.token);
  const png = await generateQrPngBuffer(url, 256);

  return new NextResponse(Buffer.from(png), {
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "private, max-age=3600",
    },
  });
}
