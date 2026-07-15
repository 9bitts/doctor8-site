/**
 * Patient-facing psychology terms (Assinar Termos).
 * TCLE + Contract (+ minor authorizations). No session recording — not offered on Doctor8.
 */

export type PatientPsychologyTermId =
  | "TDIC_CONSENT"
  | "TDIC_CONTRACT"
  | "MINOR_PSYCHOTHERAPY_AUTH"
  | "MINOR_GENERAL_AUTH"
  | "ADOLESCENT_ASSENT";

export type PatientTermAudience = "all" | "minor" | "adolescent";

export type PatientTermFieldKey =
  | "patientFullName"
  | "patientCpf"
  | "patientDob"
  | "patientPhone"
  | "patientCity"
  | "serviceType"
  | "sessionFrequency"
  | "sessionDuration"
  | "feeAmount"
  | "guardianName"
  | "guardianCpf"
  | "guardianRelation"
  | "guardianPhone"
  | "guardianAddress"
  | "guardianIdDoc"
  | "adolescentName"
  | "adolescentDob"
  | "adolescentIdDoc";

export interface PatientTermFieldDef {
  key: PatientTermFieldKey;
  labelPt: string;
  labelEn: string;
  labelEs: string;
  required: boolean;
  kind: "text" | "date" | "select";
  options?: { value: string; labelPt: string; labelEn: string; labelEs: string }[];
  guardianOnly?: boolean;
}

export interface PatientPsychologyTermDef {
  id: PatientPsychologyTermId;
  audience: PatientTermAudience;
  titlePt: string;
  titleEn: string;
  titleEs: string;
  summaryPt: string;
  summaryEn: string;
  summaryEs: string;
  fields: PatientTermFieldDef[];
}

const SERVICE_TYPE_OPTIONS = [
  { value: "psicoterapia", labelPt: "Psicoterapia", labelEn: "Psychotherapy", labelEs: "Psicoterapia" },
  { value: "avaliacao", labelPt: "Avaliação psicológica", labelEn: "Psychological assessment", labelEs: "Evaluación psicológica" },
  { value: "orientacao", labelPt: "Orientação psicológica", labelEn: "Psychological counseling", labelEs: "Orientación psicológica" },
  { value: "outro", labelPt: "Outro", labelEn: "Other", labelEs: "Otro" },
];

const FREQUENCY_OPTIONS = [
  { value: "semanal", labelPt: "Semanal", labelEn: "Weekly", labelEs: "Semanal" },
  { value: "quinzenal", labelPt: "Quinzenal", labelEn: "Biweekly", labelEs: "Quincenal" },
  { value: "mensal", labelPt: "Mensal", labelEn: "Monthly", labelEs: "Mensual" },
  { value: "combinado", labelPt: "Conforme combinado", labelEn: "As agreed", labelEs: "Según lo acordado" },
];

const PATIENT_CORE: PatientTermFieldDef[] = [
  { key: "patientFullName", labelPt: "Nome completo", labelEn: "Full name", labelEs: "Nombre completo", required: true, kind: "text" },
  { key: "patientCpf", labelPt: "CPF (ou documento)", labelEn: "ID / CPF", labelEs: "CPF / documento", required: true, kind: "text" },
  { key: "patientDob", labelPt: "Data de nascimento", labelEn: "Date of birth", labelEs: "Fecha de nacimiento", required: true, kind: "date" },
  { key: "patientPhone", labelPt: "Telefone / e-mail", labelEn: "Phone / email", labelEs: "Teléfono / e-mail", required: true, kind: "text" },
  { key: "patientCity", labelPt: "Cidade / UF", labelEn: "City / state", labelEs: "Ciudad / estado", required: false, kind: "text" },
];

const GUARDIAN_FIELDS: PatientTermFieldDef[] = [
  { key: "guardianName", labelPt: "Nome do responsável legal", labelEn: "Legal guardian full name", labelEs: "Nombre del responsable legal", required: true, kind: "text", guardianOnly: true },
  { key: "guardianCpf", labelPt: "CPF do responsável", labelEn: "Guardian ID / CPF", labelEs: "CPF del responsable", required: true, kind: "text", guardianOnly: true },
  { key: "guardianRelation", labelPt: "Parentesco", labelEn: "Relationship", labelEs: "Parentesco", required: true, kind: "text", guardianOnly: true },
  { key: "guardianPhone", labelPt: "Telefone do responsável", labelEn: "Guardian phone", labelEs: "Teléfono del responsable", required: true, kind: "text", guardianOnly: true },
  { key: "guardianAddress", labelPt: "Endereço do responsável", labelEn: "Guardian address", labelEs: "Dirección del responsable", required: false, kind: "text", guardianOnly: true },
  { key: "guardianIdDoc", labelPt: "RG / documento do responsável", labelEn: "Guardian ID document", labelEs: "Documento del responsable", required: false, kind: "text", guardianOnly: true },
];

export const PATIENT_PSYCHOLOGY_TERMS: PatientPsychologyTermDef[] = [
  {
    id: "TDIC_CONSENT",
    audience: "all",
    titlePt: "TCLE — atendimento por TDICs",
    titleEn: "Informed consent — telepsychology",
    titleEs: "TCLE — atención por TDICs",
    summaryPt: "Consentimento informado para atendimento psicológico online (Res. CFP 09/2024), separado do TCLE geral de telemedicina da plataforma.",
    summaryEn: "Informed consent for online psychological care (CFP Res. 09/2024), separate from the platform telemedicine TCLE.",
    summaryEs: "Consentimiento informado para atención psicológica online (Res. CFP 09/2024), separado del TCLE general de telemedicina.",
    fields: [
      ...PATIENT_CORE,
      { key: "serviceType", labelPt: "Tipo de serviço", labelEn: "Service type", labelEs: "Tipo de servicio", required: true, kind: "select", options: SERVICE_TYPE_OPTIONS },
      ...GUARDIAN_FIELDS,
    ],
  },
  {
    id: "TDIC_CONTRACT",
    audience: "all",
    titlePt: "Contrato de prestação de serviços (TDICs)",
    titleEn: "Psychological services agreement (TDICs)",
    titleEs: "Contrato de prestación de servicios (TDICs)",
    summaryPt: "Contrato com o psicólogo para atendimento online: frequência, duração e honorários combinados.",
    summaryEn: "Agreement with your psychologist for online care: frequency, duration and fees.",
    summaryEs: "Contrato con el psicólogo para atención online: frecuencia, duración y honorarios.",
    fields: [
      ...PATIENT_CORE,
      { key: "serviceType", labelPt: "Tipo de serviço", labelEn: "Service type", labelEs: "Tipo de servicio", required: true, kind: "select", options: SERVICE_TYPE_OPTIONS },
      { key: "sessionFrequency", labelPt: "Frequência das sessões", labelEn: "Session frequency", labelEs: "Frecuencia de sesiones", required: true, kind: "select", options: FREQUENCY_OPTIONS },
      { key: "sessionDuration", labelPt: "Duração da sessão (minutos)", labelEn: "Session duration (minutes)", labelEs: "Duración de la sesión (minutos)", required: true, kind: "text" },
      { key: "feeAmount", labelPt: "Valor por sessão (R$ ou “conforme combinado”)", labelEn: "Fee per session", labelEs: "Valor por sesión", required: true, kind: "text" },
      ...GUARDIAN_FIELDS,
    ],
  },
  {
    id: "MINOR_PSYCHOTHERAPY_AUTH",
    audience: "minor",
    titlePt: "Autorização — psicoterapia (menor de 18 anos)",
    titleEn: "Authorization — psychotherapy (under 18)",
    titleEs: "Autorización — psicoterapia (menor de 18 años)",
    summaryPt: "Autorização do responsável legal para psicoterapia (Res. CFP 13/2022 — Anexo I).",
    summaryEn: "Legal guardian authorization for psychotherapy (CFP Res. 13/2022 — Annex I).",
    summaryEs: "Autorización del responsable legal para psicoterapia (Res. CFP 13/2022 — Anexo I).",
    fields: [
      { key: "adolescentName", labelPt: "Nome da criança/adolescente", labelEn: "Child/adolescent name", labelEs: "Nombre del niño/adolescente", required: true, kind: "text" },
      { key: "adolescentDob", labelPt: "Data de nascimento", labelEn: "Date of birth", labelEs: "Fecha de nacimiento", required: true, kind: "date" },
      { key: "adolescentIdDoc", labelPt: "Documento / certidão", labelEn: "ID / birth certificate", labelEs: "Documento / partida", required: false, kind: "text" },
      ...GUARDIAN_FIELDS.map((f) => ({ ...f, required: f.key !== "guardianAddress" && f.key !== "guardianIdDoc" })),
    ],
  },
  {
    id: "MINOR_GENERAL_AUTH",
    audience: "minor",
    titlePt: "Autorização — atendimento não eventual (menor)",
    titleEn: "Authorization — non-occasional care (minor)",
    titleEs: "Autorización — atención no eventual (menor)",
    summaryPt: "Autorização do responsável para acompanhamento ou avaliação psicológica (CEPP Art. 8º / Res. CFP 16/2019).",
    summaryEn: "Guardian authorization for ongoing psychological care or assessment.",
    summaryEs: "Autorización del responsable para acompañamiento o evaluación psicológica.",
    fields: [
      { key: "adolescentName", labelPt: "Nome da criança/adolescente", labelEn: "Child/adolescent name", labelEs: "Nombre del niño/adolescente", required: true, kind: "text" },
      { key: "adolescentDob", labelPt: "Data de nascimento", labelEn: "Date of birth", labelEs: "Fecha de nacimiento", required: true, kind: "date" },
      { key: "adolescentIdDoc", labelPt: "Documento / certidão", labelEn: "ID / birth certificate", labelEs: "Documento / partida", required: false, kind: "text" },
      ...GUARDIAN_FIELDS.map((f) => ({ ...f, required: f.key !== "guardianAddress" && f.key !== "guardianIdDoc" })),
    ],
  },
  {
    id: "ADOLESCENT_ASSENT",
    audience: "adolescent",
    titlePt: "Assentimento do adolescente (12–17 anos)",
    titleEn: "Adolescent assent (ages 12–17)",
    titleEs: "Asentimiento del adolescente (12–17 años)",
    summaryPt: "Concordância do próprio adolescente, em linguagem simples, complementar à autorização do responsável.",
    summaryEn: "The adolescent’s own agreement in simple language, in addition to guardian authorization.",
    summaryEs: "Acuerdo del propio adolescente, en lenguaje simple, además de la autorización del responsable.",
    fields: [
      { key: "adolescentName", labelPt: "Seu nome", labelEn: "Your name", labelEs: "Tu nombre", required: true, kind: "text" },
      { key: "adolescentDob", labelPt: "Sua data de nascimento", labelEn: "Your date of birth", labelEs: "Tu fecha de nacimiento", required: true, kind: "date" },
    ],
  },
];

export const PSY_TERM_CONTENT_MARKER = "__DOCTOR8_PSY_TERM__";

export function getPatientPsychologyTerm(id: string): PatientPsychologyTermDef | undefined {
  return PATIENT_PSYCHOLOGY_TERMS.find((t) => t.id === id);
}

/** Age in full years from ISO date YYYY-MM-DD; null if invalid. */
export function ageFromIsoDate(iso: string | null | undefined, now = new Date()): number | null {
  if (!iso || !/^\d{4}-\d{2}-\d{2}$/.test(iso)) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dob = new Date(y, m - 1, d);
  if (Number.isNaN(dob.getTime())) return null;
  let age = now.getFullYear() - dob.getFullYear();
  const md = now.getMonth() - dob.getMonth();
  if (md < 0 || (md === 0 && now.getDate() < dob.getDate())) age -= 1;
  return age;
}

export function isMinorAge(age: number | null): boolean {
  return age !== null && age < 18;
}

export function isAdolescentAge(age: number | null): boolean {
  return age !== null && age >= 12 && age < 18;
}

export function termsVisibleForAge(age: number | null): PatientPsychologyTermDef[] {
  return PATIENT_PSYCHOLOGY_TERMS.filter((t) => {
    if (t.audience === "all") return true;
    if (t.audience === "minor") return isMinorAge(age);
    if (t.audience === "adolescent") return isAdolescentAge(age);
    return false;
  });
}

export function termRequiresGuardian(
  term: PatientPsychologyTermDef,
  age: number | null,
): boolean {
  if (term.audience === "minor") return true;
  if (term.audience === "adolescent") return false;
  return isMinorAge(age);
}

export function fieldsForTerm(
  term: PatientPsychologyTermDef,
  age: number | null,
): PatientTermFieldDef[] {
  const needGuardian = termRequiresGuardian(term, age);
  return term.fields.filter((f) => !f.guardianOnly || needGuardian);
}

export function validateTermFields(
  term: PatientPsychologyTermDef,
  values: Record<string, string>,
  age: number | null,
): string | null {
  for (const f of fieldsForTerm(term, age)) {
    if (!f.required) continue;
    if (!String(values[f.key] ?? "").trim()) {
      return f.labelPt;
    }
  }
  return null;
}

function optionLabel(field: PatientTermFieldDef, value: string, lang: "pt" | "en" | "es"): string {
  const opt = field.options?.find((o) => o.value === value);
  if (!opt) return value;
  if (lang === "en") return opt.labelEn;
  if (lang === "es") return opt.labelEs;
  return opt.labelPt;
}

export function renderPatientTermDocument(opts: {
  term: PatientPsychologyTermDef;
  values: Record<string, string>;
  age: number | null;
  professionalName: string;
  signedAtIso: string;
  shareAuthorized: boolean;
  lang?: "pt" | "en" | "es";
}): string {
  const lang = opts.lang ?? "pt";
  const title = lang === "en" ? opts.term.titleEn : lang === "es" ? opts.term.titleEs : opts.term.titlePt;
  const lines: string[] = [
    `${PSY_TERM_CONTENT_MARKER}${opts.term.id}`,
    `signedAt=${opts.signedAtIso}`,
    `shareAuthorized=${opts.shareAuthorized ? "yes" : "no"}`,
    `professional=${opts.professionalName}`,
    "",
    title.toUpperCase(),
    "—",
    "",
  ];

  if (opts.term.id === "TDIC_CONSENT") {
    lines.push(
      "Declaro que fui informado(a) sobre o atendimento psicológico mediado por TDICs",
      "(Resolução CFP nº 09/2024), inclusive recursos tecnológicos da plataforma Doctor8",
      "(videoconferência, prontuário eletrônico, mensagens), sigilo profissional e seus limites,",
      "limites do atendimento remoto e direito de revogar este consentimento.",
      "",
      "Este termo é específico da relação com o(a) psicólogo(a) e é distinto do TCLE geral",
      "de telemedicina da plataforma Doctor8.",
      "",
    );
  } else if (opts.term.id === "TDIC_CONTRACT") {
    lines.push(
      "Contrato de prestação de serviços psicológicos mediados por TDICs, conforme",
      "Resolução CFP nº 09/2024 e, quando psicoterapia, Resolução CFP nº 13/2022.",
      "O(a) paciente (ou responsável) concorda com as condições abaixo e autoriza o envio",
      "deste documento ao(à) profissional indicado(a).",
      "",
    );
  } else if (opts.term.id === "MINOR_PSYCHOTHERAPY_AUTH") {
    lines.push(
      "AUTORIZAÇÃO PARA ACOMPANHAMENTO PSICOTERAPÊUTICO DE MENORES DE 18 ANOS",
      "(Resolução CFP nº 13/2022 — Anexo I)",
      "",
      "O responsável legal autoriza o acompanhamento psicoterapêutico e os encaminhamentos",
      "cabíveis, com garantia de sigilo, dignidade e intimidade da criança/adolescente.",
      "",
    );
  } else if (opts.term.id === "MINOR_GENERAL_AUTH") {
    lines.push(
      "AUTORIZAÇÃO PARA ACOMPANHAMENTO PSICOLÓGICO NÃO EVENTUAL E/OU AVALIAÇÃO",
      "(Resolução CFP nº 16/2019 — Anexo V / CEPP Art. 8º)",
      "",
    );
  } else if (opts.term.id === "ADOLESCENT_ASSENT") {
    lines.push(
      "TERMO DE ASSENTIMENTO DO ADOLESCENTE (12 a 17 anos)",
      "",
      "Entendi que o atendimento psicológico é um espaço de conversa com profissionais de",
      "psicologia, que o que eu contar é sigiloso (exceto risco grave), que posso fazer",
      "perguntas e interromper quando quiser, e concordo em participar.",
      "",
    );
  }

  lines.push("DADOS PREENCHIDOS", "—");
  for (const f of fieldsForTerm(opts.term, opts.age)) {
    const raw = String(opts.values[f.key] ?? "").trim();
    if (!raw) continue;
    const label = lang === "en" ? f.labelEn : lang === "es" ? f.labelEs : f.labelPt;
    const display = f.kind === "select" ? optionLabel(f, raw, lang) : raw;
    lines.push(`${label}: ${display}`);
  }

  lines.push(
    "",
    `Profissional destinatário: ${opts.professionalName}`,
    `Data/hora do aceite eletrônico: ${opts.signedAtIso}`,
    opts.shareAuthorized
      ? "Autorização de compartilhamento: SIM — o paciente/responsável autorizou enviar este termo ao profissional."
      : "Autorização de compartilhamento: NÃO",
    "",
    "Assinatura eletrônica: aceite registrado na plataforma Doctor8 (sem gravação de sessão nesta plataforma).",
  );

  return lines.join("\n");
}

export function parseTermIdFromContent(content: string | null | undefined): PatientPsychologyTermId | null {
  if (!content) return null;
  const m = content.match(new RegExp(`${PSY_TERM_CONTENT_MARKER}([A-Z0-9_]+)`));
  if (!m) return null;
  const id = m[1] as PatientPsychologyTermId;
  return getPatientPsychologyTerm(id) ? id : null;
}
