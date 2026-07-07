// Digital anamnesis form for psychologists — shareable link before first session.

export interface AnamnesisField {
  key: string;
  labelPt: string;
  labelEn: string;
  labelEs: string;
  placeholderPt: string;
  type: "textarea" | "text";
  required?: boolean;
}

export const PSYCHOLOGY_ANAMNESIS_FIELDS: AnamnesisField[] = [
  {
    key: "chiefComplaint",
    labelPt: "Queixa principal / motivo da consulta",
    labelEn: "Chief complaint / reason for consultation",
    labelEs: "Motivo de consulta",
    placeholderPt: "O que levou você a buscar atendimento psicológico?",
    type: "textarea",
    required: true,
  },
  {
    key: "history",
    labelPt: "Histórico do problema atual",
    labelEn: "History of present problem",
    labelEs: "Historia del problema actual",
    placeholderPt: "Quando começou, como evoluiu, o que já tentou...",
    type: "textarea",
  },
  {
    key: "personalHistory",
    labelPt: "Histórico pessoal relevante",
    labelEn: "Relevant personal history",
    labelEs: "Historia personal relevante",
    placeholderPt: "Trajetória de vida, eventos marcantes, saúde mental anterior...",
    type: "textarea",
  },
  {
    key: "familyHistory",
    labelPt: "Histórico familiar",
    labelEn: "Family history",
    labelEs: "Historia familiar",
    placeholderPt: "Antecedentes de saúde mental na família, dinâmica familiar...",
    type: "textarea",
  },
  {
    key: "previousTherapy",
    labelPt: "Atendimentos psicológicos/psiquiátricos anteriores",
    labelEn: "Previous psychological/psychiatric care",
    labelEs: "Atenciones psicológicas/psiquiátricas previas",
    placeholderPt: "Já fez terapia ou usa medicação? Quais e por quanto tempo?",
    type: "textarea",
  },
  {
    key: "medications",
    labelPt: "Medicações em uso",
    labelEn: "Current medications",
    labelEs: "Medicaciones actuales",
    placeholderPt: "Liste medicações e dosagens, se houver.",
    type: "textarea",
  },
  {
    key: "emergencyContact",
    labelPt: "Contato de emergência",
    labelEn: "Emergency contact",
    labelEs: "Contacto de emergencia",
    placeholderPt: "Nome, parentesco e telefone",
    type: "text",
    required: true,
  },
  {
    key: "expectations",
    labelPt: "Expectativas com o tratamento",
    labelEn: "Treatment expectations",
    labelEs: "Expectativas del tratamiento",
    placeholderPt: "O que você espera do acompanhamento?",
    type: "textarea",
  },
];

export function buildAnamnesisBody(fields: Record<string, string>): string {
  return PSYCHOLOGY_ANAMNESIS_FIELDS.map((f) => {
    const val = (fields[f.key] || "").trim() || "—";
    return `${f.labelPt.toUpperCase()}:\n${val}`;
  }).join("\n\n");
}

export function buildAnamnesisPayload(fields: Record<string, string>) {
  return {
    psychologyAnamnesis: true,
    fields,
    renderedBody: buildAnamnesisBody(fields),
    submittedAt: new Date().toISOString(),
  };
}

export function anamnesisPublicUrl(token: string): string {
  const base = process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.app";
  return `${base}/anamnese-psi/${token}`;
}
