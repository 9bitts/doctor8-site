import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { buildPgrInventoryExport } from "@/lib/employer-nr1";

type PgrPayload = NonNullable<Awaited<ReturnType<typeof buildPgrInventoryExport>>>;

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
  return lines;
}

export async function buildPgrInventoryPdf(payload: PgrPayload): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const fontBold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage([595, 842]);
  let y = 800;
  const margin = 50;
  const lineHeight = 14;

  function addLine(text: string, bold = false, size = 10) {
    if (y < 60) {
      page = doc.addPage([595, 842]);
      y = 800;
    }
    page.drawText(text, {
      x: margin,
      y,
      size,
      font: bold ? fontBold : font,
      color: rgb(0.1, 0.15, 0.2),
    });
    y -= lineHeight;
  }

  addLine("Doctor8 Empresas — Inventário PGR (Riscos Psicossociais)", true, 14);
  addLine(`Gerado em: ${new Date(payload.generatedAt).toLocaleString("pt-BR")}`, false, 9);
  addLine(`Referência: ${payload.normReference}`, false, 9);
  y -= 8;

  addLine("Empresa", true, 11);
  addLine(`${payload.company.nomeFantasia} (${payload.company.razaoSocial})`);
  addLine(`CNPJ: ${payload.company.cnpj} · Grau de risco: ${payload.company.grauRisco ?? "—"}`);
  addLine(`Colaboradores: ${payload.company.employeeCount ?? "—"}`);
  addLine(`Score NR-1: ${payload.complianceScore ?? 0}%`);
  y -= 8;

  addLine("Inventário de riscos", true, 11);
  if (payload.inventory.length === 0) {
    addLine("Nenhum risco registrado.");
  } else {
    for (const r of payload.inventory) {
      addLine(`${r.hazardCode} — ${r.hazardLabel}`, true, 9);
      for (const line of wrapText(`Severidade ${r.severity} × Prob. ${r.probability} = ${r.riskLevel}`, 90)) {
        addLine(line, false, 9);
      }
      if (r.processDescription) {
        for (const line of wrapText(`Processo: ${r.processDescription}`, 90)) {
          addLine(line, false, 8);
        }
      }
      y -= 4;
    }
  }

  y -= 8;
  addLine("Avaliação Ergonômica Preliminar (AEP)", true, 11);
  if (!payload.aep) {
    addLine("Nenhuma AEP registrada.");
  } else {
    addLine(`${payload.aep.title} — v${payload.aep.version} — ${payload.aep.status}`, false, 9);
    if (payload.aep.methodology) addLine(`Metodologia: ${payload.aep.methodology}`, false, 8);
    if (payload.aep.approvedByName) addLine(`Aprovado por: ${payload.aep.approvedByName}`, false, 8);
  }

  y -= 8;
  addLine("Pesquisas organizacionais", true, 11);
  const surveys = payload.surveys ?? [];
  if (surveys.length === 0) {
    addLine("Nenhuma pesquisa registrada.");
  } else {
    for (const s of surveys) {
      addLine(`• ${s.title} (${s.instrument}) — ${s.status} — ${s.responseCount} respostas`, false, 9);
    }
  }

  y -= 8;
  addLine("EAP / saúde mental", true, 11);
  if (!payload.eap) {
    addLine("Benefício EAP não configurado.");
  } else {
    addLine(
      `Ativo: ${payload.eap.enabled ? "sim" : "não"} · ${payload.eap.sessionsPerEmployee} sessões/colaborador · ${payload.eap.totalSessionsUsed} sessões utilizadas`,
      false,
      9,
    );
  }

  y -= 8;
  addLine("PCMSO", true, 11);
  if (!payload.pcmso?.coordinatorName) {
    addLine("Coordenador PCMSO não vinculado.");
  } else {
    addLine(`Coordenador: ${payload.pcmso.coordinatorName}${payload.pcmso.coordinatorCrm ? ` (CRM ${payload.pcmso.coordinatorCrm})` : ""}`, false, 9);
  }

  y -= 8;
  addLine("Canal de denúncias", true, 11);
  addLine(`Denúncias em aberto / análise: ${payload.whistleblowerOpenCount ?? 0}`, false, 9);

  y -= 8;
  addLine("Plano de ação (resumo)", true, 11);
  const items = payload.actionPlan?.items ?? [];
  if (items.length === 0) {
    addLine("Nenhuma ação registrada.");
  } else {
    for (const item of items.slice(0, 15)) {
      addLine(`• [${item.status}] ${item.measureDescription}`, false, 9);
    }
    if (items.length > 15) addLine(`… e mais ${items.length - 15} itens`, false, 8);
  }

  y -= 12;
  addLine("Documento gerado pela plataforma Doctor8 Empresas para fins de conformidade NR-1.", false, 8);
  addLine("Não substitui laudo técnico assinado por profissional habilitado.", false, 8);

  return doc.save();
}
