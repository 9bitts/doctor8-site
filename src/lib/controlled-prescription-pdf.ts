/**
 * PDFs regulatórios — Notificação de Receita B (azul) e Receita de Controle Especial.
 * Layout alinhado aos campos exigidos pela Portaria 344/98 e RDC 1.000/2025.
 */
import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import type { Lang } from "@/lib/prescription-pdf";
import type { PrescriptionFormKind } from "@/lib/prescription-form-kind";

export interface ControlledPrescriptionPdfData {
  lang: Lang;
  formKind: "NRB" | "RCE";
  sncrReceiptNumber: string;
  proFirstName: string;
  proLastName: string;
  proSpecialty: string;
  proLicense: string;
  clinicAddressFull: string;
  patientName: string;
  patientAge: number | null;
  patientCpf: string;
  patientAddressFull: string;
  todayText: string;
  validUntilText: string;
  medications: {
    name: string;
    dosage: string;
    frequency: string;
    duration?: string;
    instructions?: string;
    presentation?: string;
    pharmaceuticalForm?: string;
  }[];
  instructions: string;
  issuedViaTelemedicine?: boolean;
  devMode?: boolean;
  pharmacyQrPng?: Uint8Array;
}

const BLUE = rgb(0.05, 0.35, 0.75);
const RED = rgb(0.72, 0.12, 0.15);
const DARK = rgb(0.1, 0.1, 0.1);
const GRAY = rgb(0.45, 0.45, 0.45);
const WHITE = rgb(1, 1, 1);

const T: Record<Lang, Record<string, string>> = {
  pt: {
    nrbTitle: "NOTIFICACAO DE RECEITA B",
    nrbSubtitle: "Substancias psicotropicas — Portaria SVS/MS 344/1998",
    rceTitle: "RECEITA DE CONTROLE ESPECIAL",
    rceSubtitle: "2 vias — Portaria SVS/MS 344/1998",
    sncr: "Numeracao SNCR",
    patient: "Paciente",
    cpf: "CPF",
    age: "Idade",
    address: "Endereco",
    prescriber: "Prescritor",
    date: "Data de emissao",
    valid: "Validade para dispensacao",
    buyer: "Identificacao do comprador",
    supplier: "Identificacao do fornecedor",
    telemedicine: "Emitido em modalidade de telemedicina (Res. CFM 2.314/2022)",
    devBanner: "AMBIENTE DE HOMOLOGACAO — numeração de teste SNCR",
    footer: "Documento nato-digital. Validacao ITI + SNCR na dispensacao.",
    copyPatient: "Via do paciente",
    copyPharmacy: "Via da farmacia (retencao)",
  },
  en: {
    nrbTitle: "PRESCRIPTION B NOTIFICATION",
    nrbSubtitle: "Psychotropic substances — Portaria 344/1998",
    rceTitle: "SPECIAL CONTROL PRESCRIPTION",
    rceSubtitle: "2 copies — Portaria 344/1998",
    sncr: "SNCR number",
    patient: "Patient",
    cpf: "CPF",
    age: "Age",
    address: "Address",
    prescriber: "Prescriber",
    date: "Issue date",
    valid: "Valid for dispensing until",
    buyer: "Buyer identification",
    supplier: "Supplier identification",
    telemedicine: "Issued via telemedicine (CFM Res. 2.314/2022)",
    devBanner: "SANDBOX — test SNCR numbering",
    footer: "Native digital document. ITI + SNCR validation at pharmacy.",
    copyPatient: "Patient copy",
    copyPharmacy: "Pharmacy copy (retained)",
  },
  es: {
    nrbTitle: "NOTIFICACION DE RECETA B",
    nrbSubtitle: "Sustancias psicotropicas — Portaria 344/1998",
    rceTitle: "RECETA DE CONTROL ESPECIAL",
    rceSubtitle: "2 vias — Portaria 344/1998",
    sncr: "Numeracion SNCR",
    patient: "Paciente",
    cpf: "CPF",
    age: "Edad",
    address: "Direccion",
    prescriber: "Prescriptor",
    date: "Fecha de emision",
    valid: "Validez para dispensacion",
    buyer: "Identificacion del comprador",
    supplier: "Identificacion del proveedor",
    telemedicine: "Emitido en telemedicina (Res. CFM 2.314/2022)",
    devBanner: "HOMOLOGACION — numeracion de prueba SNCR",
    footer: "Documento nato-digital. Validacion ITI + SNCR en farmacia.",
    copyPatient: "Via del paciente",
    copyPharmacy: "Via de farmacia (retencion)",
  },
};

function sanitize(s: string): string {
  return String(s ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x00-\xFF]/g, "");
}

function text(
  page: PDFPage,
  s: string,
  x: number,
  y: number,
  size: number,
  font: PDFFont,
  color = DARK,
) {
  page.drawText(sanitize(s), { x, y, size, font, color });
}

async function drawControlledPage(
  pdf: PDFDocument,
  data: ControlledPrescriptionPdfData,
  copyLabel: string | null,
): Promise<void> {
  const tr = T[data.lang] || T.pt;
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const accent = data.formKind === "NRB" ? BLUE : RED;
  const page = pdf.addPage([595.28, 841.89]);
  const margin = 40;
  let y = 801;

  page.drawRectangle({
    x: margin,
    y: y - 52,
    width: 595.28 - margin * 2,
    height: 52,
    color: accent,
  });
  const title = data.formKind === "NRB" ? tr.nrbTitle : tr.rceTitle;
  const subtitle = data.formKind === "NRB" ? tr.nrbSubtitle : tr.rceSubtitle;
  text(page, title, margin + 12, y - 22, 13, fontBold, WHITE);
  text(page, subtitle, margin + 12, y - 40, 8, font, WHITE);
  y -= 68;

  if (copyLabel) {
    text(page, copyLabel, margin, y, 8, fontBold, accent);
    y -= 14;
  }

  if (data.devMode) {
    page.drawRectangle({
      x: margin,
      y: y - 16,
      width: 515,
      height: 18,
      color: rgb(1, 0.95, 0.8),
      borderColor: rgb(0.9, 0.7, 0.2),
      borderWidth: 1,
    });
    text(page, tr.devBanner, margin + 8, y - 12, 7, fontBold, rgb(0.5, 0.35, 0));
    y -= 28;
  }

  text(page, `${tr.sncr}: ${data.sncrReceiptNumber}`, margin, y, 11, fontBold, accent);
  y -= 22;

  text(page, tr.prescriber, margin, y, 7, fontBold, GRAY);
  text(page, `Dr(a). ${data.proFirstName} ${data.proLastName}`, margin, y - 14, 10, fontBold);
  text(page, `${data.proLicense} — ${data.proSpecialty}`, margin, y - 28, 9, font);
  if (data.clinicAddressFull) {
    text(page, data.clinicAddressFull, margin, y - 42, 8, font, GRAY);
    y -= 56;
  } else {
    y -= 36;
  }

  page.drawLine({
    start: { x: margin, y },
    end: { x: 555, y },
    thickness: 0.5,
    color: accent,
  });
  y -= 18;

  text(page, tr.patient, margin, y, 7, fontBold, GRAY);
  text(page, data.patientName, margin, y - 14, 11, fontBold);
  const patientLine2 = [
    data.patientCpf ? `${tr.cpf}: ${data.patientCpf}` : "",
    data.patientAge != null ? `${tr.age}: ${data.patientAge}` : "",
  ]
    .filter(Boolean)
    .join("   ");
  if (patientLine2) text(page, patientLine2, margin, y - 30, 9, font);
  if (data.patientAddressFull) {
    text(page, `${tr.address}: ${data.patientAddressFull}`, margin, y - 44, 8, font, GRAY);
    y -= 58;
  } else {
    y -= 40;
  }

  text(page, `${tr.date}: ${data.todayText}`, margin, y, 8, font);
  text(page, `${tr.valid}: ${data.validUntilText}`, margin + 260, y, 8, font);
  y -= 24;

  if (data.issuedViaTelemedicine) {
    text(page, tr.telemedicine, margin, y, 7, font, GRAY);
    y -= 16;
  }

  text(page, "Rx", margin, y - 8, 28, font, accent);
  y -= 36;

  data.medications.forEach((med, i) => {
    // Name only — do not append catalog presentation lists (all strengths/forms).
    const line = `${i + 1}. ${med.name}`;
    text(page, line, margin, y, 11, fontBold);
    y -= 14;
    const parts = [
      med.dosage ? `Dose: ${med.dosage}` : "",
      med.frequency ? `Freq.: ${med.frequency}` : "",
      med.duration ? `Duracao: ${med.duration}` : "",
    ].filter(Boolean);
    if (parts.length) {
      text(page, parts.join("   "), margin + 12, y, 9, font);
      y -= 12;
    }
    if (med.instructions) {
      text(page, med.instructions, margin + 12, y, 8, font, GRAY);
      y -= 12;
    }
    y -= 6;
  });

  if (data.instructions) {
    y -= 8;
    text(page, data.instructions, margin, y, 9, font, GRAY);
    y -= 20;
  }

  if (data.formKind === "RCE") {
    y -= 10;
    text(page, tr.buyer, margin, y, 7, fontBold, GRAY);
    page.drawLine({ start: { x: margin, y: y - 24 }, end: { x: 555, y: y - 24 }, thickness: 0.5, color: GRAY });
    text(page, tr.supplier, margin, y - 40, 7, fontBold, GRAY);
    page.drawLine({ start: { x: margin, y: y - 64 }, end: { x: 555, y: y - 64 }, thickness: 0.5, color: GRAY });
  }

  text(page, tr.footer, margin, 36, 7, font, GRAY);

  if (data.pharmacyQrPng?.length) {
    try {
      const qr = await pdf.embedPng(data.pharmacyQrPng);
      page.drawImage(qr, { x: 555 - 72, y: 48, width: 64, height: 64 });
    } catch {
      // optional
    }
  }
}

export async function buildControlledPrescriptionPdf(
  data: ControlledPrescriptionPdfData,
): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const tr = T[data.lang] || T.pt;

  await drawControlledPage(pdf, data, null);

  if (data.formKind === "RCE") {
    await drawControlledPage(
      pdf,
      data,
      `${tr.copyPharmacy} — ${data.sncrReceiptNumber}`,
    );
  }

  return pdf.save();
}

export function isControlledFormKind(
  kind: string | null | undefined,
): kind is "NRB" | "RCE" {
  return kind === "NRB" || kind === "RCE";
}

export function prescriptionFormKindToPdfKind(
  kind: PrescriptionFormKind,
): "NRB" | "RCE" | null {
  if (kind === "NRB" || kind === "RCE") return kind;
  return null;
}
