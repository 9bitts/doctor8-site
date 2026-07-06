import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { SignLang } from "@/lib/sign-helpers";

const ROSE = rgb(190 / 255, 24 / 255, 93 / 255);
const DARK = rgb(0.1, 0.1, 0.1);
const GRAY = rgb(0.42, 0.42, 0.42);

function sanitize(s: string): string {
  return String(s ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x00-\xFF]/g, "");
}

const L: Record<SignLang, Record<string, string>> = {
  pt: {
    title: "Prescricao de Medicamentos — Enfermagem",
    cofen: "Conforme Resolucao COFEN n 801/2024",
    patient: "Paciente",
    nurse: "Enfermeiro(a)",
    coren: "COREN",
    date: "Data",
    validUntil: "Validade",
    medications: "Medicamentos",
    instructions: "Orientacoes",
    footer: "Documento eletronico emitido via Doctor8. Competencia privativa do enfermeiro conforme legislacao vigente.",
  },
  en: {
    title: "Nursing Medication Prescription",
    cofen: "Per COFEN Resolution 801/2024 (Brazil)",
    patient: "Patient",
    nurse: "Nurse",
    coren: "License",
    date: "Date",
    validUntil: "Valid until",
    medications: "Medications",
    instructions: "Instructions",
    footer: "Electronic document issued via Doctor8. Nursing scope per applicable regulations.",
  },
  es: {
    title: "Prescripcion de Medicamentos — Enfermeria",
    cofen: "Conforme Resolucion COFEN n 801/2024",
    patient: "Paciente",
    nurse: "Enfermero(a)",
    coren: "Licencia",
    date: "Fecha",
    validUntil: "Validez",
    medications: "Medicamentos",
    instructions: "Indicaciones",
    footer: "Documento electronico emitido via Doctor8. Competencia privativa de enfermeria segun normativa vigente.",
  },
};

type MedItem = {
  name?: string;
  dosage?: string;
  route?: string;
  frequency?: string;
  duration?: string;
  instructions?: string;
};

export async function buildNursingMedPrescriptionPdf(opts: {
  lang: SignLang;
  prescriptionId: string;
  patientName: string;
  nurseName: string;
  license: string;
  medications: MedItem[];
  instructions?: string | null;
  validUntil?: Date | null;
  createdAt: Date;
}): Promise<Uint8Array> {
  const tr = L[opts.lang] || L.pt;
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);
  let y = 800;

  const draw = (text: string, size: number, f = font, color = DARK) => {
    page.drawText(sanitize(text), { x: 50, y, size, font: f, color });
    y -= size + 6;
  };

  page.drawText(sanitize(tr.title), { x: 50, y, size: 16, font: bold, color: ROSE });
  y -= 24;
  draw(tr.cofen, 9, font, GRAY);
  y -= 8;
  draw(`${tr.patient}: ${opts.patientName}`, 11);
  draw(`${tr.nurse}: ${opts.nurseName}`, 11);
  draw(`${tr.coren}: ${opts.license}`, 11);
  draw(`${tr.date}: ${opts.createdAt.toLocaleDateString(opts.lang === "en" ? "en-US" : opts.lang === "es" ? "es-ES" : "pt-BR")}`, 11);
  if (opts.validUntil) {
    draw(`${tr.validUntil}: ${opts.validUntil.toLocaleDateString(opts.lang === "en" ? "en-US" : opts.lang === "es" ? "es-ES" : "pt-BR")}`, 11);
  }
  y -= 10;
  draw(tr.medications, 12, bold);
  for (const m of opts.medications) {
    const line = `- ${m.name || ""} | ${m.dosage || ""} | ${m.route || ""} | ${m.frequency || ""}${m.duration ? ` | ${m.duration}` : ""}`;
    draw(line, 10);
    if (m.instructions) draw(`  ${m.instructions}`, 9, font, GRAY);
  }
  if (opts.instructions) {
    y -= 8;
    draw(tr.instructions, 12, bold);
    draw(opts.instructions, 10);
  }
  page.drawText(sanitize(tr.footer), { x: 50, y: 40, size: 8, font, color: GRAY, maxWidth: 495 });
  page.drawText(sanitize(`ID: ${opts.prescriptionId}`), { x: 50, y: 28, size: 7, font, color: GRAY });

  return pdf.save();
}
