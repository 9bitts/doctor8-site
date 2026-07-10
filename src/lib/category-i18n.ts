// Localized labels for seeded document categories (canonical names/slugs from DB).

import type { Lang } from "@/lib/i18n/translations";

const GROUP_LABELS: Record<string, Record<Lang, string>> = {
  "Exames": { pt: "Exames", en: "Exams", es: "Exámenes" },
  "Documentos médico-legais": { pt: "Documentos médico-legais", en: "Medico-legal documents", es: "Documentos médico-legales" },
  "Registros clínicos": { pt: "Registros clínicos", en: "Clinical records", es: "Registros clínicos" },
  "Prescrição": { pt: "Prescrição", en: "Prescription", es: "Prescripción" },
  "Nutrição": { pt: "Nutrição", en: "Nutrition", es: "Nutrición" },
  "Psicologia": { pt: "Psicologia", en: "Psychology", es: "Psicología" },
  "Outros": { pt: "Outros", en: "Other", es: "Otros" },
};

const ITEM_LABELS: Record<string, Record<Lang, string>> = {
  "exame-de-sangue-laboratorial": { pt: "Exame de sangue / laboratorial", en: "Blood / lab test", es: "Análisis de sangre / laboratorio" },
  "exame-de-imagem-radiologico-ultrassom": { pt: "Exame de imagem (radiológico, ultrassom)", en: "Imaging exam (radiology, ultrasound)", es: "Examen de imagen (radiología, ecografía)" },
  "exame-cardiologico-ecg-etc": { pt: "Exame cardiológico (ECG, etc.)", en: "Cardiac exam (ECG, etc.)", es: "Examen cardiológico (ECG, etc.)" },
  "resultado-de-exame": { pt: "Resultado de exame", en: "Test result", es: "Resultado de examen" },
  "solicitacao-pedido-de-exame": { pt: "Solicitação / pedido de exame", en: "Exam request", es: "Solicitud de examen" },
  "atestado": { pt: "Atestado", en: "Medical certificate", es: "Certificado médico" },
  "laudo": { pt: "Laudo", en: "Medical report", es: "Informe médico" },
  "relatorio-medico": { pt: "Relatório médico", en: "Medical report", es: "Informe médico" },
  "parecer": { pt: "Parecer", en: "Expert opinion", es: "Dictamen" },
  "encaminhamento-referencia": { pt: "Encaminhamento / referência", en: "Referral", es: "Derivación / referencia" },
  "termo-de-consentimento": { pt: "Termo de consentimento", en: "Consent form", es: "Formulario de consentimiento" },
  "anamnese": { pt: "Anamnese", en: "Medical history intake", es: "Anamnesis" },
  "evolucao-clinica": { pt: "Evolução clínica", en: "Clinical progress note", es: "Evolución clínica" },
  "sinais-vitais": { pt: "Sinais vitais", en: "Vital signs", es: "Signos vitales" },
  "nota-clinica-observacao": { pt: "Nota clínica / observação", en: "Clinical note / observation", es: "Nota clínica / observación" },
  "diagnostico": { pt: "Diagnóstico", en: "Diagnosis", es: "Diagnóstico" },
  "plano-terapeutico": { pt: "Plano terapêutico", en: "Treatment plan", es: "Plan terapéutico" },
  "prescricao-receita-medica": { pt: "Prescrição / receita médica", en: "Prescription", es: "Receta médica" },
  "avaliacao-antropometrica": { pt: "Avaliação antropométrica", en: "Anthropometric assessment", es: "Evaluación antropométrica" },
  "plano-alimentar": { pt: "Plano alimentar", en: "Meal plan", es: "Plan alimentario" },
  "recordatorio-alimentar-r24h": { pt: "Recordatório alimentar (R24h)", en: "24-hour dietary recall", es: "Recordatorio alimentario (24h)" },
  "anamnese-nutricional": { pt: "Anamnese nutricional", en: "Nutritional history", es: "Anamnesis nutricional" },
  "avaliacao-psicologica": { pt: "Avaliação psicológica", en: "Psychological assessment", es: "Evaluación psicológica" },
  "evolucao-de-sessao": { pt: "Evolução de sessão", en: "Session progress note", es: "Evolución de sesión" },
  "anamnese-psicologica": { pt: "Anamnese psicológica", en: "Psychological history", es: "Anamnesis psicológica" },
  "relatorio-psicologico": { pt: "Relatório psicológico", en: "Psychological report", es: "Informe psicológico" },
  "imagem-foto-clinica": { pt: "Imagem / foto clínica", en: "Clinical image / photo", es: "Imagen / foto clínica" },
  "documento-diverso": { pt: "Documento diverso", en: "Other document", es: "Documento diverso" },
};

const NAME_TO_SLUG: Record<string, string> = {
  "Exame de sangue / laboratorial": "exame-de-sangue-laboratorial",
  "Exame de imagem (radiológico, ultrassom)": "exame-de-imagem-radiologico-ultrassom",
  "Exame cardiológico (ECG, etc.)": "exame-cardiologico-ecg-etc",
  "Resultado de exame": "resultado-de-exame",
  "Solicitação / pedido de exame": "solicitacao-pedido-de-exame",
  "Atestado": "atestado",
  "Laudo": "laudo",
  "Relatório médico": "relatorio-medico",
  "Parecer": "parecer",
  "Encaminhamento / referência": "encaminhamento-referencia",
  "Termo de consentimento": "termo-de-consentimento",
  "Anamnese": "anamnese",
  "Evolução clínica": "evolucao-clinica",
  "Sinais vitais": "sinais-vitais",
  "Nota clínica / observação": "nota-clinica-observacao",
  "Diagnóstico": "diagnostico",
  "Plano terapêutico": "plano-terapeutico",
  "Prescrição / receita médica": "prescricao-receita-medica",
  "Avaliação antropométrica": "avaliacao-antropometrica",
  "Plano alimentar": "plano-alimentar",
  "Recordatório alimentar (R24h)": "recordatorio-alimentar-r24h",
  "Anamnese nutricional": "anamnese-nutricional",
  "Avaliação psicológica": "avaliacao-psicologica",
  "Evolução de sessão": "evolucao-de-sessao",
  "Anamnese psicológica": "anamnese-psicologica",
  "Relatório psicológico": "relatorio-psicologico",
  "Imagem / foto clínica": "imagem-foto-clinica",
  "Documento diverso": "documento-diverso",
};

export function getCategoryGroupLabel(lang: Lang, groupName: string | null | undefined): string {
  if (!groupName) return "";
  return GROUP_LABELS[groupName]?.[lang] ?? groupName;
}

export function getCategoryLabel(
  lang: Lang,
  opts: { slug?: string | null; name?: string | null },
): string {
  const slug = opts.slug || (opts.name ? NAME_TO_SLUG[opts.name] : undefined);
  if (slug && ITEM_LABELS[slug]) return ITEM_LABELS[slug][lang];
  return opts.name || "";
}
