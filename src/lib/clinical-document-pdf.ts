// PDF generation for exam orders and clinical documents (atestados, laudos, etc.)

import { PDFDocument, StandardFonts, rgb, PDFFont, PDFPage } from "pdf-lib";
import type { SignLang } from "@/lib/sign-helpers";

const BLUE = rgb(10 / 255, 77 / 255, 110 / 255);
const GREEN = rgb(0 / 255, 184 / 255, 122 / 255);
const DARK = rgb(0.1, 0.1, 0.1);
const GRAY = rgb(0.42, 0.42, 0.42);
const LIGHTGRAY = rgb(0.6, 0.6, 0.6);

function sanitize(s: string): string {
  return String(s ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[\u2013\u2014]/g, "-")
    .replace(/[^\x00-\xFF]/g, "");
}

const L: Record<SignLang, Record<string, string>> = {
  en: {
    tagline: "Secure Digital Health Platform",
    date: "Date", patientName: "Patient", patientAge: "Age", patientCpf: "Tax ID",
    yearsOld: "years", patientAddress: "Address", examTitle: "Exam Order",
    documentTitle: "Clinical Document", exams: "Requested exams", notes: "Notes",
    cid: "ICD", body: "Content", confidential: "CONFIDENTIAL — Protected health information.",
    digitalId: "Document ID",
  },
  pt: {
    tagline: "Plataforma Digital de Saúde Segura",
    date: "Data", patientName: "Paciente", patientAge: "Idade", patientCpf: "CPF",
    yearsOld: "anos", patientAddress: "Endereço", examTitle: "Pedido de Exames",
    documentTitle: "Documento Clínico", exams: "Exames solicitados", notes: "Observações",
    cid: "CID", body: "Conteúdo", confidential: "CONFIDENCIAL — Informação de saúde protegida.",
    digitalId: "ID do documento",
  },
  es: {
    tagline: "Plataforma Digital de Salud Segura",
    date: "Fecha", patientName: "Paciente", patientAge: "Edad", patientCpf: "CPF",
    yearsOld: "años", patientAddress: "Dirección", examTitle: "Pedido de Exámenes",
    documentTitle: "Documento Clínico", exams: "Exámenes solicitados", notes: "Observaciones",
    cid: "CIE", body: "Contenido", confidential: "CONFIDENCIAL — Información de salud protegida.",
    digitalId: "ID del documento",
  },
};

export interface ClinicalDocumentPdfData {
  lang: SignLang;
  kind: "exam" | "document";
  docTitle: string;
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
  documentId: string;
  examItems?: string[];
  examNotes?: string;
  cid?: string;
  body?: string;
}

export async function buildClinicalDocumentPdf(data: ClinicalDocumentPdfData): Promise<Uint8Array> {
  const tr = L[data.lang] || L.pt;
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdf.embedFont(StandardFonts.HelveticaOblique);

  const A4 = { w: 595.28, h: 841.89 };
  const margin = 50;
  let page = pdf.addPage([A4.w, A4.h]);
  let y = A4.h - margin;

  const text = (p: PDFPage, s: string, x: number, yy: number, size: number, f: PDFFont, color = DARK) => {
    p.drawText(sanitize(s), { x, y: yy, size, font: f, color });
  };

  const ensureSpace = (needed: number) => {
    if (y - needed < margin + 60) {
      page = pdf.addPage([A4.w, A4.h]);
      y = A4.h - margin;
    }
  };

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

  const maxW = A4.w - margin * 2;

  // Header
  text(page, "Doctor", margin, y - 18, 26, fontBold, BLUE);
  const dw = fontBold.widthOfTextAtSize("Doctor", 26);
  text(page, "8", margin + dw, y - 18, 26, fontBold, GREEN);
  text(page, tr.tagline, margin, y - 32, 8, font, GRAY);

  const rightX = A4.w - margin;
  const drawRight = (s: string, yy: number, size: number, f: PDFFont, color = DARK) => {
    const w = f.widthOfTextAtSize(sanitize(s), size);
    text(page, s, rightX - w, yy, size, f, color);
  };
  drawRight(`Dr(a). ${data.proFirstName} ${data.proLastName}`, y - 6, 13, fontBold, BLUE);
  drawRight(data.proSpecialty, y - 20, 10, font, GRAY);
  drawRight(data.proLicense, y - 32, 10, font, GRAY);
  drawRight(`${tr.date}: ${data.todayText}`, y - 46, 8, font, GRAY);
  y -= 70;

  page.drawLine({ start: { x: margin, y }, end: { x: A4.w - margin, y }, thickness: 2, color: BLUE });
  y -= 28;

  // Title
  const heading = data.kind === "exam" ? (data.docTitle || tr.examTitle) : (data.docTitle || tr.documentTitle);
  text(page, heading, margin, y, 16, fontBold, BLUE);
  y -= 28;

  // Patient box
  const fields: [string, string][] = [[tr.patientName, data.patientName]];
  if (data.patientAge != null) fields.push([tr.patientAge, `${data.patientAge} ${tr.yearsOld}`]);
  if (data.patientCpf) fields.push([tr.patientCpf, data.patientCpf]);
  const boxH = 16 + Math.ceil(fields.length / 2) * 30 + (data.patientAddressFull ? 30 : 0);
  page.drawRectangle({
    x: margin, y: y - boxH, width: A4.w - margin * 2, height: boxH,
    color: rgb(0.97, 0.98, 0.99), borderColor: rgb(0.9, 0.91, 0.92), borderWidth: 1,
  });
  const colW = (A4.w - margin * 2) / 2;
  let fy = y - 22;
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
  y -= boxH + 24;

  if (data.kind === "exam") {
    text(page, tr.exams, margin, y, 12, fontBold, DARK);
    y -= 20;
    (data.examItems || []).forEach((item, i) => {
      ensureSpace(20);
      text(page, `${i + 1}. ${item}`, margin + 8, y, 11, font, DARK);
      y -= 18;
    });
    if (data.cid) {
      ensureSpace(24);
      text(page, `${tr.cid}: ${data.cid}`, margin, y, 10, font, GRAY);
      y -= 18;
    }
    if (data.examNotes) {
      ensureSpace(40);
      text(page, tr.notes, margin, y, 10, fontBold, GRAY);
      y -= 16;
      for (const ln of wrap(data.examNotes, maxW - 16, 10, font)) {
        ensureSpace(14);
        text(page, ln, margin + 8, y, 10, font, DARK);
        y -= 14;
      }
    }
  } else {
    const body = data.body || "";
    for (const ln of wrap(body, maxW, 11, font)) {
      ensureSpace(16);
      text(page, ln, margin, y, 11, font, DARK);
      y -= 15;
    }
  }

  ensureSpace(50);
  y -= 20;
  page.drawLine({ start: { x: margin, y }, end: { x: A4.w - margin, y }, thickness: 0.5, color: LIGHTGRAY });
  y -= 16;
  text(page, `${tr.digitalId}: ${data.documentId}`, margin, y, 7, font, LIGHTGRAY);
  y -= 12;
  text(page, tr.confidential, margin, y, 7, fontItalic, LIGHTGRAY);

  return pdf.save();
}
