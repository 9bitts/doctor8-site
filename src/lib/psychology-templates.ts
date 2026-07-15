// Session note formats and CFP document templates for the Psychologist Area.

export type SessionFormat = "DAP" | "BIRP" | "SOAP" | "FREE";

export interface SessionFormatDef {
  id: SessionFormat;
  labelPt: string;
  labelEn: string;
  labelEs: string;
  fields: { key: string; labelPt: string; labelEn: string; labelEs: string; placeholderPt: string }[];
}

export const SESSION_FORMATS: SessionFormatDef[] = [
  {
    id: "DAP",
    labelPt: "DAP — Dados, Avaliação, Plano",
    labelEn: "DAP — Data, Assessment, Plan",
    labelEs: "DAP — Datos, Evaluación, Plan",
    fields: [
      { key: "data", labelPt: "Dados", labelEn: "Data", labelEs: "Datos", placeholderPt: "Informações objetivas da sessão, relatos do paciente, observações..." },
      { key: "assessment", labelPt: "Avaliação", labelEn: "Assessment", labelEs: "Evaluación", placeholderPt: "Hipóteses clínicas, compreensão do caso, evolução..." },
      { key: "plan", labelPt: "Plano", labelEn: "Plan", labelEs: "Plan", placeholderPt: "Intervenções, tarefas, encaminhamentos, próximos passos..." },
    ],
  },
  {
    id: "BIRP",
    labelPt: "BIRP — Comportamento, Intervenção, Resposta, Planejamento",
    labelEn: "BIRP — Behavior, Intervention, Response, Plan",
    labelEs: "BIRP — Comportamiento, Intervención, Respuesta, Planificación",
    fields: [
      { key: "behavior", labelPt: "Comportamento", labelEn: "Behavior", labelEs: "Comportamiento", placeholderPt: "Comportamentos observados, relatos, afetos..." },
      { key: "intervention", labelPt: "Intervenção", labelEn: "Intervention", labelEs: "Intervención", placeholderPt: "Técnicas e abordagens utilizadas na sessão..." },
      { key: "response", labelPt: "Resposta", labelEn: "Response", labelEs: "Respuesta", placeholderPt: "Reação do paciente às intervenções..." },
      { key: "plan", labelPt: "Planejamento", labelEn: "Plan", labelEs: "Planificación", placeholderPt: "Objetivos para próximas sessões..." },
    ],
  },
  {
    id: "SOAP",
    labelPt: "SOAP — Subjetivo, Objetivo, Avaliação, Plano",
    labelEn: "SOAP — Subjective, Objective, Assessment, Plan",
    labelEs: "SOAP — Subjetivo, Objetivo, Evaluación, Plan",
    fields: [
      { key: "subjective", labelPt: "Subjetivo", labelEn: "Subjective", labelEs: "Subjetivo", placeholderPt: "Queixas e relatos do paciente..." },
      { key: "objective", labelPt: "Objetivo", labelEn: "Objective", labelEs: "Objetivo", placeholderPt: "Observações clínicas objetivas..." },
      { key: "assessment", labelPt: "Avaliação", labelEn: "Assessment", labelEs: "Evaluación", placeholderPt: "Análise clínica e hipóteses..." },
      { key: "plan", labelPt: "Plano", labelEn: "Plan", labelEs: "Plan", placeholderPt: "Conduta e plano terapêutico..." },
    ],
  },
  {
    id: "FREE",
    labelPt: "Evolução livre",
    labelEn: "Free-form note",
    labelEs: "Evolución libre",
    fields: [
      { key: "content", labelPt: "Registro da sessão", labelEn: "Session record", labelEs: "Registro de la sesión", placeholderPt: "Registro livre da sessão..." },
    ],
  },
];

export {
  CFP_DOCUMENT_TEMPLATES,
  cfpDocumentSaveType,
  type CfpDocumentTemplate,
  type CfpDocumentTemplateId,
} from "./psychology-cfp-documents";

export function formatSessionNoteBody(
  format: SessionFormat,
  fields: Record<string, string>,
  durationMins?: number,
): string {
  const def = SESSION_FORMATS.find((f) => f.id === format);
  if (!def) return fields.content || "";
  const lines = def.fields.map((f) => `${f.labelPt.toUpperCase()}:\n${fields[f.key] || "—"}`);
  if (durationMins) lines.unshift(`Duração da sessão: ${durationMins} minutos`);
  return lines.join("\n\n");
}

export function buildSessionNotePayload(
  format: SessionFormat,
  fields: Record<string, string>,
  durationMins?: number,
  appointmentId?: string,
) {
  return {
    psychologyNote: true,
    format,
    fields,
    sessionDurationMins: durationMins ?? null,
    appointmentId: appointmentId ?? null,
    renderedBody: formatSessionNoteBody(format, fields, durationMins),
  };
}

export function buildScalePayload(
  scaleId: string,
  responses: number[],
  score: number,
  interpretation: { levelPt: string; levelEn: string; levelEs: string },
  risk?: {
    level: string;
    flags: string[];
    messagePt: string;
    messageEn: string;
    messageEs: string;
  } | null,
) {
  return {
    psychologyScale: true,
    scaleId,
    responses,
    score,
    interpretation,
    risk: risk ?? null,
  };
}
