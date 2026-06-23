// DIAGNÓSTICO 3 — gera PDF real + chama Lacuna com o PDF, capturando tudo.
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { buildPrescriptionPdf } from "@/lib/prescription-pdf";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const steps: string[] = [];
  try {
    const session = await auth();
    if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

    const body = await req.json();
    const prescriptionId = String(body.prescriptionId || "");
    const prescription = await db.prescription.findUnique({
      where: { id: prescriptionId },
      include: { professional: true },
    });
    if (!prescription) return NextResponse.json({ error: "não encontrada", steps }, { status: 404 });
    const pro = prescription.professional;

    const meds = (prescription.medications as any[]).map((m) => ({
      name: m.name, dosage: m.dosage, frequency: m.frequency, duration: m.duration, instructions: m.instructions,
    }));

    const pdfBytes = await buildPrescriptionPdf({
      lang: "pt",
      proFirstName: pro.firstName, proLastName: pro.lastName,
      proSpecialty: pro.specialty, proLicense: pro.licenseNumber,
      clinicAddressFull: "", patientName: "Paciente", patientAge: null, patientCpf: "",
      patientAddressFull: "", prescriptionId: prescription.id,
      todayText: "hoje", validUntilText: "depois", medications: meds, instructions: "", signed: false,
    });
    steps.push("pdf:" + pdfBytes.length);

    const base64 = Buffer.from(pdfBytes).toString("base64");
    const ENDPOINT = (process.env.LACUNA_ENDPOINT || "").replace(/\/+$/, "");
    const API_KEY = process.env.LACUNA_API_KEY || "";
    const CTX = process.env.LACUNA_SECURITY_CONTEXT || "";

    const lacunaBody = {
      returnUrl: "https://app.doctor8.org/api/professional/prescriptions/sign/callback?prescriptionId=" + prescription.id,
      documents: [{ file: { content: base64, name: "receita.pdf" } }],
      securityContextId: CTX,
    };
    steps.push("body-pronto:" + JSON.stringify(lacunaBody).length + "chars");

    const controller = new AbortController();
    const to = setTimeout(() => controller.abort(), 40000);
    let res: Response;
    try {
      res = await fetch(`${ENDPOINT}/api/signature-sessions`, {
        method: "POST",
        headers: { Authorization: `Bearer ${API_KEY}`, "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify(lacunaBody),
        signal: controller.signal,
      });
    } catch (e) {
      clearTimeout(to);
      steps.push("FETCH-FAIL:" + (e as Error).name + ":" + (e as Error).message);
      return NextResponse.json({ error: "fetch falhou", steps }, { status: 500 });
    }
    clearTimeout(to);
    steps.push("lacuna-status:" + res.status);
    const txt = await res.text();
    steps.push("lacuna-resp:" + txt.slice(0, 400));

    return NextResponse.json({ ok: true, steps });
  } catch (e) {
    steps.push("CATCH:" + ((e as Error).message || String(e)));
    return NextResponse.json({ error: "erro", steps }, { status: 500 });
  }
}
