/**
 * Regras básicas de interação fitoterápico × medicamento convencional.
 * Complementa o motor do farmacêutico para alertas na prescrição médica.
 */

export type PhytoInteractionSeverity = "MINOR" | "MODERATE" | "MAJOR";

export type PhytoInteractionWarning = {
  herb: string;
  drug: string;
  severity: PhytoInteractionSeverity;
  description: string;
};

type PhytoRule = {
  herbPatterns: RegExp[];
  drugPatterns: RegExp[];
  severity: PhytoInteractionSeverity;
  description: string;
};

const RULES: PhytoRule[] = [
  {
    herbPatterns: [/hypericum|hipérico|st\.?\s*john/i],
    drugPatterns: [/sertralina|fluoxetina|paroxetina|venlafaxina|ssri|antidepress/i],
    severity: "MAJOR",
    description: "Hipérico pode reduzir eficácia de ISRS e aumentar efeitos adversos.",
  },
  {
    herbPatterns: [/hypericum|hipérico/i],
    drugPatterns: [/warfarin|varfarina|anticoagul/i],
    severity: "MODERATE",
    description: "Hipérico pode alterar metabolismo de anticoagulantes.",
  },
  {
    herbPatterns: [/ginkgo/i],
    drugPatterns: [/warfarin|varfarina|aspirina|aas|clopidogrel|anticoagul/i],
    severity: "MODERATE",
    description: "Ginkgo pode aumentar risco de sangramento com anticoagulantes/antiplaquetários.",
  },
  {
    herbPatterns: [/valeriana|passiflora|passiflor/i],
    drugPatterns: [/diazepam|clonazepam|alprazolam|zolpidem|benzodiazep|sedativ/i],
    severity: "MODERATE",
    description: "Sedativos vegetais podem potencializar depressores do SNC.",
  },
  {
    herbPatterns: [/boldo/i],
    drugPatterns: [/gestante|gravidez|pregnant/i],
    severity: "MAJOR",
    description: "Boldo contraindicado na gestação.",
  },
];

function matchesAny(text: string, patterns: RegExp[]): boolean {
  return patterns.some((p) => p.test(text));
}

export function checkPhytoDrugInteractions(
  herbs: string[],
  drugs: string[],
): PhytoInteractionWarning[] {
  const warnings: PhytoInteractionWarning[] = [];
  for (const herb of herbs) {
    for (const drug of drugs) {
      for (const rule of RULES) {
        if (matchesAny(herb, rule.herbPatterns) && matchesAny(drug, rule.drugPatterns)) {
          warnings.push({
            herb,
            drug,
            severity: rule.severity,
            description: rule.description,
          });
        }
      }
    }
  }
  return warnings;
}

export function extractMnHerbNames(
  medications: Array<{ name?: string; itemKind?: string; mnSlug?: string }>,
): string[] {
  const kinds = new Set([
    "phytotherapy",
    "homeopathy",
    "aromatherapy",
    "apitherapy",
  ]);
  return medications
    .filter((m) => kinds.has(m.itemKind || "") || m.mnSlug)
    .map((m) => m.name?.trim() || "")
    .filter(Boolean);
}
