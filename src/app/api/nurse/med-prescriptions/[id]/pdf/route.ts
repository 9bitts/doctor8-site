import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getNursingMedRxPdfData } from "@/lib/nursing/chart-prescriptions";
import { buildNursingMedPrescriptionPdf } from "@/lib/nursing/nursing-med-prescription-pdf";
import type { SignLang } from "@/lib/sign-helpers";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const lang = (req.nextUrl.searchParams.get("lang") || "pt") as SignLang;
  const data = await getNursingMedRxPdfData(params.id, session.user.id);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pdfBytes = await buildNursingMedPrescriptionPdf({
    lang,
    prescriptionId: data.id,
    patientName: data.patient.name,
    nurseName: data.professional.name,
    license: data.professional.license,
    medications: data.medications,
    instructions: data.instructions,
    validUntil: data.validUntil,
    createdAt: data.createdAt,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="prescricao-enfermagem-${params.id.slice(0, 8)}.pdf"`,
    },
  });
}
