// PDF export for psychology patient charts and honorarium receipts.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { SignLang } from "@/lib/sign-helpers";

const DARK = rgb(0.1, 0.1, 0.1);
const GRAY = rgb(0.45, 0.45, 0.45);
const VIOLET = rgb(0.42, 0.27, 0.76);

function sanitize(s: string): string {
  return String(s ?? "")
    .replace(/[\u2018\u2019]/g, "'")
    .replace(/[\u201C\u201D]/g, '"')
    .replace(/[^\x00-\xFF]/g, "");
}

function wrapText(text: string, maxChars: number): string[] {
  const lines: string[] = [];
  for (const para of text.split("\n")) {
    if (!para.trim()) {
      lines.push("");
      continue;
    }
    let remaining = para;
    while (remaining.length > maxChars) {
      let breakAt = remaining.lastIndexOf(" ", maxChars);
      if (breakAt < maxChars * 0.5) breakAt = maxChars;
      lines.push(remaining.slice(0, breakAt).trim());
      remaining = remaining.slice(breakAt).trim();
    }
    if (remaining) lines.push(remaining);
  }
  return lines;
}

export interface ChartExportSection {
  title: string;
  body: string;
  date?: string;
}

export async function buildPsychologyChartPdf(opts: {
  lang: SignLang;
  patientName: string;
  psychologistName: string;
  crp: string;
  sections: ChartExportSection[];
  exportedAt: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  const labels = {
    pt: {
      title: "Prontuário Psicológico — Exportação",
      patient: "Paciente",
      professional: "Psicóloga(o)",
      exported: "Exportado em",
      footer: "CONFIDENCIAL — LGPD / CFP. Uso exclusivo do profissional habilitado.",
    },
    en: {
      title: "Psychological Chart — Export",
      patient: "Patient",
      professional: "Psychologist",
      exported: "Exported at",
      footer: "CONFIDENTIAL — For licensed professional use only.",
    },
    es: {
      title: "Historial Psicológico — Exportación",
      patient: "Paciente",
      professional: "Psicólogo/a",
      exported: "Exportado el",
      footer: "CONFIDENCIAL — Uso exclusivo del profesional habilitado.",
    },
  }[opts.lang];

  let page = pdf.addPage([595, 842]);
  let y = 800;

  const drawLine = (text: string, size: number, f = font, color = DARK) => {
    if (y < 60) {
      page = pdf.addPage([595, 842]);
      y = 800;
    }
    page.drawText(sanitize(text), { x: 50, y, size, font: f, color });
    y -= size + 6;
  };

  drawLine(labels.title, 16, bold, VIOLET);
  y -= 4;
  drawLine(`${labels.patient}: ${opts.patientName}`, 10);
  drawLine(`${labels.professional}: ${opts.psychologistName} — CRP ${opts.crp}`, 10);
  drawLine(`${labels.exported}: ${opts.exportedAt}`, 9, font, GRAY);
  y -= 8;

  for (const section of opts.sections) {
    drawLine(section.title, 11, bold);
    if (section.date) drawLine(section.date, 8, font, GRAY);
    for (const line of wrapText(section.body, 90)) {
      drawLine(line, 9);
    }
    y -= 6;
  }

  drawLine(labels.footer, 7, font, GRAY);

  return pdf.save();
}

export async function buildHonorariumReceiptPdf(opts: {
  lang: SignLang;
  psychologistName: string;
  crp: string;
  patientName: string;
  patientCpf: string;
  amountBrl: string;
  serviceDate: string;
  description: string;
  city?: string;
}): Promise<Uint8Array> {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  const page = pdf.addPage([595, 842]);

  const L = {
    pt: {
      title: "RECIBO DE HONORÁRIOS PROFISSIONAIS",
      note: "Modelo auxiliar Doctor8 — para fins fiscais de PF, emita o recibo oficial no app Receita Saúde (obrigatório desde 2025).",
      received: "Recebi de",
      amount: "a quantia de R$",
      referent: "referente a",
      date: "Data do atendimento",
      city: "Local e data",
      signature: "Assinatura do(a) profissional",
    },
    en: {
      title: "PROFESSIONAL FEE RECEIPT",
      note: "Doctor8 helper template — for Brazilian PF tax purposes, issue official receipt via Receita Saúde app.",
      received: "Received from",
      amount: "the amount of R$",
      referent: "for",
      date: "Service date",
      city: "Place and date",
      signature: "Professional signature",
    },
    es: {
      title: "RECIBO DE HONORARIOS PROFESIONALES",
      note: "Plantilla auxiliar Doctor8 — para fines fiscales en Brasil, emita el recibo oficial en Receita Saúde.",
      received: "Recibí de",
      amount: "la cantidad de R$",
      referent: "por",
      date: "Fecha del servicio",
      city: "Lugar y fecha",
      signature: "Firma del/de la profesional",
    },
  }[opts.lang];

  let y = 760;
  const line = (t: string, size = 11, f = font) => {
    page.drawText(sanitize(t), { x: 50, y, size, font: f, color: DARK });
    y -= size + 10;
  };

  line(L.title, 14, bold);
  line(L.note, 8, font);
  y -= 10;
  line(`${L.received}: ${opts.patientName} — CPF ${opts.patientCpf}`);
  line(`${L.amount} ${opts.amountBrl}`);
  line(`${L.referent}: ${opts.description}`);
  line(`${L.date}: ${opts.serviceDate}`);
  y -= 20;
  line(`${L.city}: ${opts.city || "_______________"}, ${new Date().toLocaleDateString("pt-BR")}`);
  y -= 30;
  line(`${opts.psychologistName} — CRP ${opts.crp}`);
  line(L.signature);

  return pdf.save();
}
