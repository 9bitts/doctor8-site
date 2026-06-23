// DIAGNÓSTICO 2 — gera o PDF real mas NÃO chama a Lacuna.
// Se isto funcionar, o problema é a chamada à Lacuna (rede/memória do fetch).
// Se travar/502, o problema é a geração do PDF (memória).

import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { buildPrescriptionPdf, type Lang } from "@/lib/prescription-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

function safeDecrypt(v: string | null | undefined): string {
  if (v == null) return "";
  try { return decrypt(v); } catch { return v; }
}
function normLang(v: string | null | undefined): Lang {
  if (v === "pt" || v === "es") return v;
  return "en";
}

export async function POST(req: NextRequest) {
  const steps: string[] = [];
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    steps.push("auth-ok");

    const body = await req.json();
    const prescriptionId = String(body.prescriptionId || "");
    steps.push("body-ok");

    const prescription = await db.prescription.findUnique({
      where: { id: prescriptionId },
      include: {
        professional: true,
        document: { include: { patient: true, patientRecord: true } },
      },
    });
    if (!prescription) return NextResponse.json({ error: "não encontrada", steps }, { status: 404 });
    steps.push("prescription-ok");

    const pro = prescription.professional;
    const lang = normLang(session.user.id ? "pt" : "pt");
    steps.push("antes-pdf");

    const meds = (prescription.medications as any[]).map((m) => ({
      name: m.name, dosage: m.dosage, frequency: m.frequency,
      duration: m.duration, instructions: m.instructions,
    }));
    steps.push("meds:" + meds.length);

    const pdfBytes = await buildPrescriptionPdf({
      lang: "pt",
      proFirstName: pro.firstName, proLastName: pro.lastName,
      proSpecialty: pro.specialty, proLicense: pro.licenseNumber,
      clinicAddressFull: "",
      patientName: "Paciente",
      patientAge: null, patientCpf: "",
      patientAddressFull: "",
      prescriptionId: prescription.id,
      todayText: "hoje", validUntilText: "depois",
      medications: meds,
      instructions: "",
      signed: false,
    });
    steps.push("pdf-gerado:" + pdfBytes.length + "bytes");

    const base64 = Buffer.from(pdfBytes).toString("base64");
    steps.push("base64-len:" + base64.length);

    return NextResponse.json({ ok: true, steps });
  } catch (e) {
    steps.push("CATCH:" + ((e as Error).message || String(e)));
    return NextResponse.json({ error: "erro", steps }, { status: 500 });
  }
}
