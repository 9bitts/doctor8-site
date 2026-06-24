// src/lib/prescription-pdf.ts
// Gera o PDF REAL da receita (bytes) usando pdf-lib — necessário para assinatura
// PAdES via Lacuna Rest PKI Core. Substitui o antigo HTML + window.print().
//
// Esta função recebe os dados já resolvidos/descriptografados e devolve Uint8Array.
// A resolução de paciente / idioma / descriptografia continua na rota que chama isto.

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";

export type Lang = "en" | "pt" | "es";

export interface PrescriptionPdfData {
  lang: Lang;
  // Profissional
  proFirstName: string;
  proLastName: string;
  proSpecialty: string;
  proLicense: string;
  clinicAddressFull: string;
  // Paciente
  patientName: string;
  patientAge: number | null;
  patientCpf: string;
  patientAddressFull: string;
  // Receita
  prescriptionId: string;
  todayText: string;
  validUntilText: string;
  medications: {
    name: string; dosage: string; frequency: string;
    duration?: string; instructions?: string;
  }[];
  instructions: string;
  // Assinatura (se já assinada)
  signed?: boolean;
}

const L: Record<Lang, Record<string, string>> = {
  en: {
    tagline: "Secure Digital Health Platform",
    date: "Date", patientName: "Patient", patientAddress: "Address",
    patientAge: "Age", patientCpf: "Tax ID (CPF)", yearsOld: "years",
    prescriptionDate: "Prescription Date", validUntil: "Valid Until", noExpiry: "No expiry",
    dosage: "Dosage", frequency: "Frequency", duration: "Duration", instructions: "Instructions",
    generalInstructions: "General Instructions", digitalId: "Digital Prescription ID",
    digitalSignature: "Digitally signed (ICP-Brasil)",
    confidential: "CONFIDENTIAL — Protected health information.",
  },
  pt: {
    tagline: "Plataforma Digital de Saúde Segura",
    date: "Data", patientName: "Paciente", patientAddress: "Endereço",
    patientAge: "Idade", patientCpf: "CPF", yearsOld: "anos",
    prescriptionDate: "Data da prescrição", validUntil: "Válida até", noExpiry: "Sem validade",
    dosage: "Dosagem", frequency: "Frequência", duration: "Duração", instructions: "Instruções",
    generalInstructions: "Instruções gerais", digitalId: "ID da prescrição digital",
    digitalSignature: "Assinado digitalmente (ICP-Brasil)",
    confidential: "CONFIDENCIAL — Informação de saúde protegida.",
  },
  es: {
    tagline: "Plataforma Digital de Salud Segura",
    date: "Fecha", patientName: "Paciente", patientAddress: "Dirección",
    patientAge: "Edad", patientCpf: "CPF", yearsOld: "años",
    prescriptionDate: "Fecha de la receta", validUntil: "Válida hasta", noExpiry: "Sin caducidad",
    dosage: "Dosis", frequency: "Frecuencia", duration: "Duración", instructions: "Instrucciones",
    generalInstructions: "Instrucciones generales", digitalId: "ID de la receta digital",
    digitalSignature: "Firmado digitalmente (ICP-Brasil)",
    confidential: "CONFIDENCIAL — Información de salud protegida.",
  },
};

// Cores Doctor8
const BLUE = rgb(33 / 255, 106 / 255, 134 / 255);   // #216a86
const GREEN = rgb(224 / 255, 89 / 255, 48 / 255);   // #e05930
const DARK = rgb(0.1, 0.1, 0.1);
const GRAY = rgb(0.42, 0.42, 0.42);
const LIGHTGRAY = rgb(0.6, 0.6, 0.6);

// Remove caracteres fora do Latin-1 (StandardFonts WinAnsi não suporta tudo).
function sanitize(s: string): string {
  return String(s ?? "")
    .replace(/℞/g, "Rx")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x00-\xFF]/g, ""); // descarta o que WinAnsi não imprime
}

export async function buildPrescriptionPdf(
  data: PrescriptionPdfData
): Promise<Uint8Array> {
  const tr = L[data.lang] || L.pt;

  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const A4 = { w: 595.28, h: 841.89 };
  const margin = 50;
  let page = pdf.addPage([A4.w, A4.h]);
  let y = A4.h - margin;

  const text = (
    p: PDFPage, s: string, x: number, yy: number,
    size: number, f: PDFFont, color = DARK
  ) => {
    p.drawText(sanitize(s), { x, y: yy, size, font: f, color });
  };

  // Quebra de página se necessário
  const ensureSpace = (needed: number) => {
    if (y - needed < margin + 60) {
      page = pdf.addPage([A4.w, A4.h]);
      y = A4.h - margin;
    }
  };

  // ── Cabeçalho: logo Doctor8 ──
  text(page, "Doctor", margin, y - 18, 26, fontBold, BLUE);
  const dw = fontBold.widthOfTextAtSize("Doctor", 26);
  text(page, "8", margin + dw, y - 18, 26, fontBold, GREEN);
  text(page, tr.tagline, margin, y - 32, 8, font, GRAY);

  // ── Cabeçalho: dados do médico (direita) ──
  const rightX = A4.w - margin;
  const drawRight = (s: string, yy: number, size: number, f: PDFFont, color = DARK) => {
    const w = f.widthOfTextAtSize(sanitize(s), size);
    text(page, s, rightX - w, yy, size, f, color);
  };
  drawRight(`Dr(a). ${data.proFirstName} ${data.proLastName}`, y - 6, 13, fontBold, BLUE);
  drawRight(data.proSpecialty, y - 20, 10, font, GRAY);
  drawRight(data.proLicense, y - 32, 10, font, GRAY);
  if (data.clinicAddressFull) {
    drawRight(data.clinicAddressFull, y - 44, 8, font, GRAY);
    drawRight(`${tr.date}: ${data.todayText}`, y - 58, 8, font, GRAY);
    y -= 58;
  } else {
    drawRight(`${tr.date}: ${data.todayText}`, y - 44, 8, font, GRAY);
    y -= 44;
  }

  y -= 24;
  // Linha dupla divisória
  page.drawLine({ start: { x: margin, y }, end: { x: A4.w - margin, y }, thickness: 2, color: BLUE });
  y -= 3;
  page.drawLine({ start: { x: margin, y }, end: { x: A4.w - margin, y }, thickness: 0.5, color: BLUE });
  y -= 24;

  // ── Caixa do paciente ──
  const boxTop = y;
  const fields: [string, string][] = [];
  fields.push([tr.patientName, `${data.patientName}`]);
  if (data.patientAge != null) fields.push([tr.patientAge, `${data.patientAge} ${tr.yearsOld}`]);
  if (data.patientCpf) fields.push([tr.patientCpf, data.patientCpf]);
  fields.push([tr.prescriptionDate, data.todayText]);
  fields.push([tr.validUntil, data.validUntilText]);

  // Calcula altura da caixa (2 colunas + endereço full)
  const rowsLeft = Math.ceil(fields.length / 2);
  const addrRows = data.patientAddressFull ? 1 : 0;
  const boxH = 16 + rowsLeft * 30 + addrRows * 30;
  page.drawRectangle({
    x: margin, y: boxTop - boxH, width: A4.w - margin * 2, height: boxH,
    color: rgb(0.97, 0.98, 0.99), borderColor: rgb(0.9, 0.91, 0.92), borderWidth: 1,
  });

  const colW = (A4.w - margin * 2) / 2;
  let fy = boxTop - 22;
  fields.forEach((f, i) => {
    const col = i % 2;
    const fx = margin + 14 + col * colW;
    if (col === 0 && i > 0) fy -= 30;
    text(page, f[0].toUpperCase(), fx, fy, 7, fontBold, LIGHTGRAY);
    text(page, f[1], fx, fy - 12, 11, fontBold, DARK);
  });
  if (data.patientAddressFull) {
    fy -= 30;
    text(page, tr.patientAddress.toUpperCase(), margin + 14, fy, 7, fontBold, LIGHTGRAY);
    text(page, data.patientAddressFull, margin + 14, fy - 12, 10, font, DARK);
  }
  y = boxTop - boxH - 28;

  // ── Símbolo Rx ──
  text(page, "Rx", margin, y - 24, 34, fontItalic, BLUE);
  y -= 44;

  // ── Medicamentos ──
  const wrap = (s: string, maxW: number, size: number, f: PDFFont): string[] => {
    const words = sanitize(s).split(/\s+/);
    const lines: string[] = [];
    let cur = "";
    for (const w of words) {
      const test = cur ? `${cur} ${w}` : w;
      if (f.widthOfTextAtSize(test, size) > maxW && cur) { lines.push(cur); cur = w; }
      else cur = test;
    }
    if (cur) lines.push(cur);
    return lines;
  };

  const maxW = A4.w - margin * 2 - 20;
  data.medications.forEach((med, i) => {
    ensureSpace(80);
    text(page, `${i + 1}. ${med.name}`, margin, y, 13, fontBold, BLUE);
    y -= 18;
    const detail = (label: string, value: string) => {
      if (!value) return;
      const line = `${label}: ${value}`;
      for (const ln of wrap(line, maxW, 11, font)) {
        ensureSpace(16);
        text(page, ln, margin + 12, y, 11, font, rgb(0.27, 0.27, 0.27));
        y -= 15;
      }
    };
    detail(tr.dosage, med.dosage);
    detail(tr.frequency, med.frequency);
    if (med.duration) detail(tr.duration, med.duration);
    if (med.instructions) detail(tr.instructions, med.instructions);
    y -= 8;
    // separador tracejado
    ensureSpace(20);
    for (let x = margin; x < A4.w - margin; x += 6) {
      page.drawLine({ start: { x, y }, end: { x: x + 3, y }, thickness: 0.5, color: rgb(0.9, 0.9, 0.9) });
    }
    y -= 18;
  });

  // ── Instruções gerais ──
  if (data.instructions) {
    ensureSpace(60);
    page.drawRectangle({
      x: margin, y: y - 8, width: 0, height: 0,
    });
    text(page, tr.generalInstructions.toUpperCase(), margin, y, 7, fontBold, LIGHTGRAY);
    y -= 14;
    for (const ln of wrap(data.instructions, maxW, 11, font)) {
      ensureSpace(16);
      text(page, ln, margin, y, 11, font, rgb(0.27, 0.27, 0.27));
      y -= 15;
    }
    y -= 10;
  }

  // ── Rodapé: assinatura ──
  ensureSpace(90);
  y = Math.max(y, margin + 90);
  const sigY = margin + 70;

  // Linha de assinatura (direita)
  const sigLineW = 200;
  const sigX = A4.w - margin - sigLineW;
  page.drawLine({
    start: { x: sigX, y: sigY }, end: { x: sigX + sigLineW, y: sigY },
    thickness: 1, color: DARK,
  });
  const sigName = `Dr(a). ${data.proFirstName} ${data.proLastName}`;
  const sigNameW = font.widthOfTextAtSize(sanitize(sigName), 10);
  text(page, sigName, sigX + (sigLineW - sigNameW) / 2, sigY - 14, 10, font, DARK);
  const sigLic = `${data.proSpecialty} · ${data.proLicense}`;
  const sigLicW = font.widthOfTextAtSize(sanitize(sigLic), 9);
  text(page, sigLic, sigX + (sigLineW - sigLicW) / 2, sigY - 26, 9, font, GRAY);

  if (data.signed) {
    const okW = fontBold.widthOfTextAtSize(sanitize(tr.digitalSignature), 8);
    text(page, tr.digitalSignature, sigX + (sigLineW - okW) / 2, sigY - 40, 8, fontBold, GREEN);
  }

  // ID da prescrição (esquerda)
  text(page, tr.digitalId.toUpperCase(), margin, sigY, 7, fontBold, LIGHTGRAY);
  text(page, data.prescriptionId.toUpperCase().slice(0, 16), margin, sigY - 14, 9, font, GRAY);

  // Confidencial
  const confY = margin + 14;
  page.drawLine({
    start: { x: margin, y: confY + 10 }, end: { x: A4.w - margin, y: confY + 10 },
    thickness: 0.5, color: rgb(0.9, 0.9, 0.9),
  });
  const conf = tr.confidential;
  const confW = font.widthOfTextAtSize(sanitize(conf), 8);
  text(page, conf, (A4.w - confW) / 2, confY, 8, font, LIGHTGRAY);
  const idLine = `ID: ${data.prescriptionId} · Doctor8 · doctor8.org`;
  const idW = font.widthOfTextAtSize(sanitize(idLine), 7);
  text(page, idLine, (A4.w - idW) / 2, confY - 11, 7, font, LIGHTGRAY);

  return await pdf.save();
}
