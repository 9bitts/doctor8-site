import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { getPharmacyPrescriptionPdfData } from "@/lib/pharmacy/chart-prescriptions";
import { buildPharmacyPrescriptionPdf } from "@/lib/pharmacy/pharmacy-prescription-pdf";
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
  const data = await getPharmacyPrescriptionPdfData(params.id, session.user.id);
  if (!data) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const pdfBytes = await buildPharmacyPrescriptionPdf({
    lang,
    prescriptionId: data.id,
    patientName: data.patient.name,
    pharmacistName: data.professional.name,
    license: data.professional.license,
    medications: data.medications,
    instructions: data.instructions,
    validUntil: data.validUntil,
    createdAt: data.createdAt,
  });

  return new NextResponse(Buffer.from(pdfBytes), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `inline; filename="prescricao-farmaceutica-${params.id.slice(0, 8)}.pdf"`,
    },
  });
}
