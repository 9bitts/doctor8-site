/** Classic PGR + NR-1 psychosocial risk catalog for Doctor Empresas SESMT flow. */

import { NR1_PSYCHOSOCIAL_HAZARDS } from "@/lib/nr1-hazards";

export type EmployerRiskCategoryCode =
  | "FISICO"
  | "QUIMICO"
  | "BIOLOGICO"
  | "ACIDENTE"
  | "ERGONOMICO"
  | "PSICOSSOCIAL";

export type EmployerRiskCatalogItem = {
  code: string;
  category: EmployerRiskCategoryCode;
  labelPt: string;
  agent: string;
  defaultToleranceLimit?: string;
  suggestedExams?: string[];
  possibleHarm?: string;
};

export const RISK_CATEGORY_LABELS: Record<EmployerRiskCategoryCode, string> = {
  FISICO: "Físico",
  QUIMICO: "Químico",
  BIOLOGICO: "Biológico",
  ACIDENTE: "Acidentes",
  ERGONOMICO: "Ergonômico",
  PSICOSSOCIAL: "Psicossocial",
};

const CLASSIC_RISKS: EmployerRiskCatalogItem[] = [
  {
    code: "FISICO_RUIDO",
    category: "FISICO",
    labelPt: "Ruído",
    agent: "Ruído",
    defaultToleranceLimit: "85 dB(A)",
    suggestedExams: ["Exame clínico", "Audiometria"],
    possibleHarm: "Perda auditiva induzida por ruído",
  },
  {
    code: "FISICO_RAD_NAO_ION",
    category: "FISICO",
    labelPt: "Radiação não ionizante (solda)",
    agent: "Radiação não ionizante (Solda)",
    suggestedExams: ["Exame clínico", "Acuidade Visual"],
  },
  {
    code: "FISICO_FRIO",
    category: "FISICO",
    labelPt: "Frio",
    agent: "Frio",
    suggestedExams: ["Exame clínico"],
  },
  {
    code: "FISICO_CALOR",
    category: "FISICO",
    labelPt: "Calor",
    agent: "Calor",
    suggestedExams: ["Exame clínico"],
  },
  {
    code: "FISICO_VIBRACAO",
    category: "FISICO",
    labelPt: "Vibração",
    agent: "Vibração",
    suggestedExams: ["Exame clínico"],
  },
  {
    code: "QUIMICO_FUMOS_METALICOS",
    category: "QUIMICO",
    labelPt: "Fumos metálicos",
    agent: "Fumos metálicos",
    suggestedExams: ["Exame clínico", "Espirometria", "Raio X de Tórax", "Hemograma"],
  },
  {
    code: "QUIMICO_HIDROCARBONETOS",
    category: "QUIMICO",
    labelPt: "Hidrocarbonetos e compostos de carbono",
    agent: "Hidrocarbonetos",
    suggestedExams: ["Exame clínico", "Hemograma"],
  },
  {
    code: "QUIMICO_POEIRAS",
    category: "QUIMICO",
    labelPt: "Poeiras",
    agent: "Poeiras",
    suggestedExams: ["Exame clínico", "Espirometria", "Raio X de Tórax"],
  },
  {
    code: "BIOLOGICO_AGENTES",
    category: "BIOLOGICO",
    labelPt: "Agentes biológicos",
    agent: "Agentes biológicos",
    suggestedExams: ["Exame clínico"],
  },
  {
    code: "ERG_POSTURA_PE",
    category: "ERGONOMICO",
    labelPt: "Postura de pé por longos períodos",
    agent: "Postura de pé por longos períodos",
    suggestedExams: ["Exame clínico"],
  },
  {
    code: "ERG_CARGA_MANUAL",
    category: "ERGONOMICO",
    labelPt: "Levantamento e transporte manual de cargas",
    agent: "Levantamento e transporte manual de cargas",
    suggestedExams: ["Exame clínico"],
  },
  {
    code: "ERG_REPETITIVIDADE",
    category: "ERGONOMICO",
    labelPt: "Movimentos repetitivos",
    agent: "Movimentos repetitivos",
    suggestedExams: ["Exame clínico"],
  },
  {
    code: "ERG_CONCENTRACAO",
    category: "ERGONOMICO",
    labelPt: "Exigência de alto nível de concentração",
    agent: "Exigência de alto nível de concentração/atenção",
    suggestedExams: ["Exame clínico", "Avaliação Psicossocial"],
  },
  {
    code: "ACID_PROJ_PARTICULAS",
    category: "ACIDENTE",
    labelPt: "Projeção de partículas",
    agent: "Projeção de partículas",
    suggestedExams: ["Exame clínico", "Acuidade Visual"],
  },
  {
    code: "ACID_QUEDA_OBJETOS",
    category: "ACIDENTE",
    labelPt: "Queda de objetos",
    agent: "Queda de objetos",
    suggestedExams: ["Exame clínico"],
  },
  {
    code: "ACID_QUEIMADURAS",
    category: "ACIDENTE",
    labelPt: "Queimaduras",
    agent: "Queimaduras",
    suggestedExams: ["Exame clínico"],
  },
  {
    code: "ACID_CORTES",
    category: "ACIDENTE",
    labelPt: "Cortes",
    agent: "Cortes",
    suggestedExams: ["Exame clínico"],
  },
  {
    code: "ACID_CHOQUE",
    category: "ACIDENTE",
    labelPt: "Choque elétrico",
    agent: "Choque elétrico",
    suggestedExams: ["Exame clínico", "ECG"],
  },
  {
    code: "ACID_COLISAO",
    category: "ACIDENTE",
    labelPt: "Colisão",
    agent: "Colisão",
    suggestedExams: ["Exame clínico"],
  },
  {
    code: "ACID_ALTURA",
    category: "ACIDENTE",
    labelPt: "Trabalho em altura",
    agent: "Trabalho em altura",
    suggestedExams: ["Exame clínico", "EEG", "Avaliação Psicossocial", "Acuidade Visual"],
  },
];

const PSYCHO_ITEMS: EmployerRiskCatalogItem[] = NR1_PSYCHOSOCIAL_HAZARDS.map((h) => ({
  code: h.code,
  category: "PSICOSSOCIAL" as const,
  labelPt: h.labelPt,
  agent: h.labelPt,
  possibleHarm: h.possibleHarm,
  suggestedExams: ["Exame clínico", "Questionário psicossocial (triagem PCMSO)"],
}));

export const EMPLOYER_RISK_CATALOG: EmployerRiskCatalogItem[] = [...CLASSIC_RISKS, ...PSYCHO_ITEMS];

export function getRiskCatalogItem(code: string): EmployerRiskCatalogItem | undefined {
  return EMPLOYER_RISK_CATALOG.find((i) => i.code === code);
}

export function catalogByCategory(category?: EmployerRiskCategoryCode): EmployerRiskCatalogItem[] {
  if (!category) return EMPLOYER_RISK_CATALOG;
  return EMPLOYER_RISK_CATALOG.filter((i) => i.category === category);
}

/** Map risk agents → suggested PCMSO protocol exam names. */
export function suggestedExamsFromRiskCodes(codes: string[]): string[] {
  const set = new Set<string>(["Exame clínico"]);
  for (const code of codes) {
    const item = getRiskCatalogItem(code);
    for (const exam of item?.suggestedExams ?? []) set.add(exam);
  }
  if (codes.some((c) => getRiskCatalogItem(c)?.category === "PSICOSSOCIAL")) {
    set.add("Questionário psicossocial (triagem PCMSO)");
  }
  return Array.from(set);
}

export const PSYCHOSOCIAL_QUESTIONNAIRE_EXAM = "Questionário psicossocial (triagem PCMSO)";

export const EXPOSURE_TYPE_OPTIONS = [
  "Habitual e permanente",
  "Habitual e intermitente",
  "Eventual",
] as const;

export const QUALITATIVE_LEVELS = ["Baixo", "Médio", "Alto"] as const;
