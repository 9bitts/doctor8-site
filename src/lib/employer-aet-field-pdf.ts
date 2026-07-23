import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { fieldVisitProgress, parseFieldVisit, parsePhotoKeys } from "@/lib/nr1-field-visit";

type FieldReportInput = {
  companyName: string;
  cnpj: string;
  aepTitle: string;
  aepVersion: number;
  workstationDescription: string | null;
  fieldVisitJson: unknown;
  photoKeys: unknown;
  aetFindings: string | null;
  aetRecommendations: string | null;
  evaluatorName: string | null;
  evaluatorSignedAt: Date | string | null;
  aetCompletedAt: Date | string | null;
  aetStatus: string;
};

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(/\s+/);
  const lines: string[] = [];
  let line = "";
  for (const w of words) {
    const next = line ? `${line} ${w}` : w;
    if (next.length > maxChars) {
      if (line) lines.push(line);
      line = w;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  return lines.length ? lines : [""];
}

function fmtDate(value: Date | string | null | undefined): string {
  if (!value) return "—";
  const d = typeof value === "string" ? new Date(value) : value;
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString("pt-BR");
}

export async function buildAetFieldVisitPdf(input: FieldReportInput): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([595, 842]);
  let y = 800;
  const margin = 50;
  const lineHeight = 13;

  function addLine(text: string, bold = false, size = 10) {
    const lines = wrapText(text.replace(/\s+/g, " ").trim(), 85);
    for (const ln of lines) {
      if (y < 60) {
        page = doc.addPage([595, 842]);
        y = 800;
      }
      page.drawText(ln, {
        x: margin,
        y,
        size,
        font: bold ? fontBold : font,
        color: rgb(0.1, 0.15, 0.2),
      });
      y -= lineHeight;
    }
  }

  const visit = parseFieldVisit(input.fieldVisitJson);
  const progress = fieldVisitProgress(visit);
  const photos = parsePhotoKeys(input.photoKeys);

  addLine("Doctor8 Empresas — Relatório de visita ergonômica (campo)", true, 13);
  addLine("Apoio à AEP/AET (NR-17). Não substitui laudo de ergonomista quando a complexidade exigir.", false, 8);
  addLine(`Gerado em: ${new Date().toLocaleString("pt-BR")}`, false, 9);
  y -= 6;

  addLine("Empresa", true, 11);
  addLine(`${input.companyName} · CNPJ ${input.cnpj}`);
  addLine(`AEP: ${input.aepTitle} (v${input.aepVersion}) · Status visita: ${input.aetStatus}`);
  if (input.workstationDescription) addLine(`Posto: ${input.workstationDescription}`);
  y -= 6;

  addLine("Observação no posto", true, 11);
  addLine(`Tarefa observada: ${visit.taskObserved || "—"}`);
  addLine(`Escuta do trabalhador: ${visit.workerInterview || "—"}`);
  addLine(`Organização do trabalho: ${visit.organizationNotes || "—"}`);
  y -= 6;

  addLine(`Checklist de campo (${progress.done}/${progress.total})`, true, 11);
  for (const item of visit.checklist) {
    addLine(`${item.done ? "[x]" : "[ ]"} ${item.label}`);
  }
  y -= 6;

  addLine(`Fotos registradas: ${photos.length}`, true, 11);
  for (const p of photos) {
    addLine(`- ${p.key}${p.caption ? ` (${p.caption})` : ""} · ${fmtDate(p.uploadedAt)}`);
  }
  y -= 6;

  addLine("Achados", true, 11);
  addLine(input.aetFindings || "—");
  y -= 4;
  addLine("Recomendações", true, 11);
  addLine(input.aetRecommendations || "—");
  y -= 6;

  addLine("Assinatura do avaliador", true, 11);
  addLine(`Nome: ${input.evaluatorName || "—"}`);
  addLine(`Assinado em: ${fmtDate(input.evaluatorSignedAt || input.aetCompletedAt)}`);

  return doc.save();
}
