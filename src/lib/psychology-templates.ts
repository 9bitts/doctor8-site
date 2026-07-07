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

export type CfpDocumentTemplateId =
  | "TDIC_CONSENT"
  | "TDIC_CONTRACT"
  | "PSYCHOLOGICAL_REPORT"
  | "REFERRAL_NETWORK"
  | "EMERGENCY_RECORD";

export interface CfpDocumentTemplate {
  id: CfpDocumentTemplateId;
  titlePt: string;
  titleEn: string;
  titleEs: string;
  descriptionPt: string;
  descriptionEn: string;
  descriptionEs: string;
  bodyPt: string;
  bodyEn: string;
  bodyEs: string;
}

export const CFP_DOCUMENT_TEMPLATES: CfpDocumentTemplate[] = [
  {
    id: "TDIC_CONSENT",
    titlePt: "Termo de consentimento — atendimento por TDICs",
    titleEn: "Informed consent — telepsychology (TDICs)",
    titleEs: "Consentimiento informado — atención por TDICs",
    descriptionPt: "Conforme Resolução CFP nº 09/2024 — Art. 7º (recursos tecnológicos e sigilo).",
    descriptionEn: "Per CFP Resolution 09/2024 — Art. 7 (technology resources and confidentiality).",
    descriptionEs: "Conforme Resolución CFP nº 09/2024 — Art. 7 (recursos tecnológicos y sigilo).",
    bodyPt: `TERMO DE CONSENTIMENTO PARA ATENDIMENTO PSICOLÓGICO MEDIADO POR TDICs

Eu, _________________________________, CPF _________________, declaro que fui informado(a) sobre:

1. A natureza do atendimento psicológico mediado por Tecnologias Digitais da Informação e da Comunicação (TDICs);
2. Os recursos tecnológicos utilizados nesta plataforma (videoconferência, mensagens, prontuário eletrônico) e as medidas de segurança para proteção do sigilo profissional;
3. Meus direitos e deveres como usuário(a) dos serviços psicológicos;
4. Os limites do atendimento remoto, incluindo situações de urgência e emergência que exigem encaminhamento à rede presencial de proteção;
5. Que posso revogar este consentimento a qualquer momento.

Declaro estar ciente e de acordo com o atendimento nas condições descritas.

Local e data: _________________

Assinatura do(a) paciente: _________________`,
    bodyEn: `INFORMED CONSENT FOR TELEPSYCHOLOGY (TDICs)

I, _________________________________, declare that I have been informed about:

1. The nature of psychological care mediated by Digital Information and Communication Technologies (TDICs);
2. The technological resources used on this platform (videoconference, messaging, electronic records) and security measures to protect professional confidentiality;
3. My rights and duties as a user of psychological services;
4. The limits of remote care, including emergency situations requiring referral to in-person protection networks;
5. That I may revoke this consent at any time.

I declare that I am aware of and agree to care under the described conditions.

Place and date: _________________

Patient signature: _________________`,
    bodyEs: `CONSENTIMIENTO INFORMADO PARA ATENCIÓN PSICOLÓGICA MEDIADA POR TDICs

Yo, _________________________________, declaro haber sido informado(a) sobre:

1. La naturaleza de la atención psicológica mediada por Tecnologías Digitales de la Información y la Comunicación (TDICs);
2. Los recursos tecnológicos utilizados en esta plataforma y las medidas de seguridad para proteger el sigilo profesional;
3. Mis derechos y deberes como usuario(a) de los servicios psicológicos;
4. Los límites de la atención remota, incluyendo situaciones de urgencia que requieren derivación a la red presencial;
5. Que puedo revocar este consentimiento en cualquier momento.

Declaro estar informado(a) y de acuerdo con la atención en las condiciones descritas.

Lugar y fecha: _________________

Firma del/de la paciente: _________________`,
  },
  {
    id: "TDIC_CONTRACT",
    titlePt: "Contrato de prestação de serviços psicológicos (TDICs)",
    titleEn: "Psychological services agreement (TDICs)",
    titleEs: "Contrato de prestación de servicios psicológicos (TDICs)",
    descriptionPt: "Conforme Resolução CFP nº 09/2024 — Art. 7º (contrato escrito ou verbal).",
    descriptionEn: "Per CFP Resolution 09/2024 — Art. 7 (written or verbal agreement).",
    descriptionEs: "Conforme Resolución CFP nº 09/2024 — Art. 7 (contrato escrito o verbal).",
    bodyPt: `CONTRATO DE PRESTAÇÃO DE SERVIÇOS PSICOLÓGICOS MEDIADOS POR TDICs

PSICÓLOGA(O): _________________ CRP: _________________
PACIENTE: _________________ CPF: _________________

CLÁUSULAS:

I — Características do trabalho ofertado, direitos e deveres das partes;
II — Recursos tecnológicos utilizados: plataforma Doctor8 (videoconferência, prontuário eletrônico, mensagens);
III — Foro eleito: jurisdição do CRP de inscrição principal da profissional;
IV — Valor e forma de pagamento: _________________
V — Frequência e duração das sessões: _________________
VI — Sigilo profissional e proteção de dados conforme LGPD e Código de Ética Profissional do Psicólogo.

As partes declaram estar de acordo.

Local e data: _________________

Assinatura da psicóloga(o): _________________    Assinatura do(a) paciente: _________________`,
    bodyEn: `PSYCHOLOGICAL SERVICES AGREEMENT (TDICs)

PSYCHOLOGIST: _________________ License: _________________
PATIENT: _________________ ID: _________________

CLAUSES:

I — Characteristics of services, rights and duties of both parties;
II — Technology resources: Doctor8 platform (videoconference, electronic records, messaging);
III — Jurisdiction: region of the psychologist's primary registration;
IV — Fee and payment: _________________
V — Session frequency and duration: _________________
VI — Professional confidentiality and data protection per applicable ethics and privacy laws.

Both parties agree to the above.

Place and date: _________________

Psychologist signature: _________________    Patient signature: _________________`,
    bodyEs: `CONTRATO DE PRESTACIÓN DE SERVICIOS PSICOLÓGICOS MEDIADOS POR TDICs

PSICÓLOGO(A): _________________ Registro: _________________
PACIENTE: _________________ ID: _________________

CLÁUSULAS:

I — Características del trabajo ofrecido, derechos y deberes de las partes;
II — Recursos tecnológicos: plataforma Doctor8 (videoconferencia, historial electrónico, mensajes);
III — Jurisdicción: región de inscripción principal del/de la profesional;
IV — Valor y forma de pago: _________________
V — Frecuencia y duración de las sesiones: _________________
VI — Sigilo profesional y protección de datos conforme normativa aplicable.

Las partes declaran estar de acuerdo.

Lugar y fecha: _________________

Firma del/de la psicólogo(a): _________________    Firma del/de la paciente: _________________`,
  },
  {
    id: "PSYCHOLOGICAL_REPORT",
    titlePt: "Relatório psicológico",
    titleEn: "Psychological report",
    titleEs: "Informe psicológico",
    descriptionPt: "Modelo base para relatório psicológico conforme práticas do CFP.",
    descriptionEn: "Base template for psychological reports per CFP practices.",
    descriptionEs: "Modelo base para informe psicológico conforme prácticas del CFP.",
    bodyPt: `RELATÓRIO PSICOLÓGICO

Identificação do(a) paciente: _________________
Psicóloga(o): _________________ CRP: _________________
Finalidade: _________________
Período de acompanhamento: _________________

1. DEMANDA / MOTIVO DO ENCAMINHAMENTO
_________________________________________________

2. PROCEDIMENTOS UTILIZADOS
_________________________________________________

3. ANÁLISE / RESULTADOS
_________________________________________________

4. CONCLUSÃO
_________________________________________________

5. ENCAMINHAMENTOS (se houver)
_________________________________________________

Local e data: _________________

Assinatura e carimbo CRP: _________________`,
    bodyEn: `PSYCHOLOGICAL REPORT

Patient identification: _________________
Psychologist: _________________ License: _________________
Purpose: _________________
Follow-up period: _________________

1. REASON FOR REFERRAL
_________________________________________________

2. PROCEDURES USED
_________________________________________________

3. ANALYSIS / RESULTS
_________________________________________________

4. CONCLUSION
_________________________________________________

5. REFERRALS (if any)
_________________________________________________

Place and date: _________________

Signature and license stamp: _________________`,
    bodyEs: `INFORME PSICOLÓGICO

Identificación del/de la paciente: _________________
Psicólogo(a): _________________ Registro: _________________
Finalidad: _________________
Período de seguimiento: _________________

1. DEMANDA / MOTIVO DE LA DERIVACIÓN
_________________________________________________

2. PROCEDIMIENTOS UTILIZADOS
_________________________________________________

3. ANÁLISIS / RESULTADOS
_________________________________________________

4. CONCLUSIÓN
_________________________________________________

5. DERIVACIONES (si las hay)
_________________________________________________

Lugar y fecha: _________________

Firma y sello profesional: _________________`,
  },
  {
    id: "REFERRAL_NETWORK",
    titlePt: "Registro de encaminhamento à rede de proteção",
    titleEn: "Referral to protection network record",
    titleEs: "Registro de derivación a la red de protección",
    descriptionPt: "Conforme Resolução CFP nº 09/2024 — Art. 5º §2 (registro obrigatório no prontuário).",
    descriptionEn: "Per CFP Resolution 09/2024 — Art. 5 §2 (mandatory record in chart).",
    descriptionEs: "Conforme Resolución CFP nº 09/2024 — Art. 5 §2 (registro obligatorio en el historial).",
    bodyPt: `REGISTRO DE ENCAMINHAMENTO / ARTICULAÇÃO COM REDE DE PROTEÇÃO

Paciente: _________________
Data/hora: _________________
Situação identificada: ( ) risco à integridade  ( ) violência  ( ) urgência/emergência  ( ) outro: _______

Descrição da situação:
_________________________________________________

Ações realizadas:
_________________________________________________

Serviços/instituições contactados:
_________________________________________________

Encaminhamento para atendimento presencial: ( ) Sim  ( ) Não
Destino: _________________

Registrado por: _________________ CRP: _________________`,
    bodyEn: `REFERRAL / PROTECTION NETWORK RECORD

Patient: _________________
Date/time: _________________
Situation: ( ) integrity risk  ( ) violence  ( ) emergency  ( ) other: _______

Description:
_________________________________________________

Actions taken:
_________________________________________________

Services/institutions contacted:
_________________________________________________

Referred for in-person care: ( ) Yes  ( ) No
Destination: _________________

Recorded by: _________________ License: _________________`,
    bodyEs: `REGISTRO DE DERIVACIÓN / RED DE PROTECCIÓN

Paciente: _________________
Fecha/hora: _________________
Situación: ( ) riesgo a la integridad  ( ) violencia  ( ) urgencia/emergencia  ( ) otro: _______

Descripción:
_________________________________________________

Acciones realizadas:
_________________________________________________

Servicios/instituciones contactados:
_________________________________________________

Derivación a atención presencial: ( ) Sí  ( ) No
Destino: _________________

Registrado por: _________________ Registro: _________________`,
  },
  {
    id: "EMERGENCY_RECORD",
    titlePt: "Registro de situação de urgência/emergência em TDICs",
    titleEn: "Emergency situation record during TDIC session",
    titleEs: "Registro de situación de urgencia/emergencia en TDICs",
    descriptionPt: "Conforme Resolução CFP nº 09/2024 — Art. 5º (urgência, emergência, rede presencial).",
    descriptionEn: "Per CFP Resolution 09/2024 — Art. 5 (urgency, emergency, in-person network).",
    descriptionEs: "Conforme Resolución CFP nº 09/2024 — Art. 5 (urgencia, emergencia, red presencial).",
    bodyPt: `REGISTRO DE URGÊNCIA/EMERGÊNCIA EM ATENDIMENTO POR TDICs

Paciente: _________________
Data/hora da sessão: _________________
Meio de atendimento: videoconferência / mensagem / outro

Situação de risco identificada:
_________________________________________________

Medidas imediatas adotadas:
_________________________________________________

Encaminhamento para rede presencial: _________________
Contatos de emergência acionados: _________________

Continuidade do acompanhamento remoto: ( ) Sim  ( ) Não  ( ) Suspenso temporariamente

Observações:
_________________________________________________

Psicóloga(o): _________________ CRP: _________________`,
    bodyEn: `EMERGENCY RECORD DURING TDIC SESSION

Patient: _________________
Session date/time: _________________
Medium: videoconference / messaging / other

Risk situation identified:
_________________________________________________

Immediate measures taken:
_________________________________________________

Referred to in-person network: _________________
Emergency contacts notified: _________________

Remote follow-up continues: ( ) Yes  ( ) No  ( ) Temporarily suspended

Notes:
_________________________________________________

Psychologist: _________________ License: _________________`,
    bodyEs: `REGISTRO DE URGENCIA/EMERGENCIA EN ATENCIÓN POR TDICs

Paciente: _________________
Fecha/hora de la sesión: _________________
Medio: videoconferencia / mensaje / otro

Situación de riesgo identificada:
_________________________________________________

Medidas inmediatas adoptadas:
_________________________________________________

Derivación a red presencial: _________________
Contactos de emergencia activados: _________________

Continuidad del seguimiento remoto: ( ) Sí  ( ) No  ( ) Suspendido temporalmente

Observaciones:
_________________________________________________

Psicólogo(a): _________________ Registro: _________________`,
  },
];

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
