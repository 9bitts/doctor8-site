import type { MedicationItem } from "./types";

export type InteractionResult = {
  drugA: string;
  drugB: string;
  severity: "NONE" | "MINOR" | "MODERATE" | "MAJOR" | "CONTRAINDICATED";
  description: string;
};

type InteractionRule = {
  patterns: [RegExp, RegExp];
  severity: InteractionResult["severity"];
  description: string;
};

const RULES: InteractionRule[] = [
  {
    patterns: [/warfarin|varfarina|coumadin/i, /aspirina|aas|ácido acetilsalicílico|ibuprofeno|naproxeno|diclofenaco/i],
    severity: "MAJOR",
    description: "AINEs aumentam risco de sangramento com anticoagulantes.",
  },
  {
    patterns: [/warfarin|varfarina/i, /amoxicilina|metronidazol|fluconazol|sulfametoxazol/i],
    severity: "MODERATE",
    description: "Antibióticos/antifúngicos podem potencializar efeito anticoagulante.",
  },
  {
    patterns: [/losartana|enalapril|captopril|lisinopril/i, /espironolactona|amilorida|triamterene/i],
    severity: "MAJOR",
    description: "Combinação de IECA/BRA com poupadores de potássio — risco de hipercalemia.",
  },
  {
    patterns: [/metformina/i, /contraste|iopamidol|iohexol/i],
    severity: "MODERATE",
    description: "Contraste iodado — suspender metformina conforme protocolo renal.",
  },
  {
    patterns: [/fluoxetina|sertralina|paroxetina|escitalopram/i, /tramadol|fentanil|morfina/i],
    severity: "MAJOR",
    description: "Risco de síndrome serotoninérgica (ISRS + opioide).",
  },
  {
    patterns: [/fluoxetina|sertralina|paroxetina/i, /linezolida|tramadol|sumatriptano/i],
    severity: "MAJOR",
    description: "Risco de síndrome serotoninérgica.",
  },
  {
    patterns: [/digoxina/i, /amiodarona|verapamil|diltiazem/i],
    severity: "MODERATE",
    description: "Aumento dos níveis séricos de digoxina.",
  },
  {
    patterns: [/sinvastatina|atorvastatina|rosuvastatina/i, /claritromicina|itraconazol|ritonavir/i],
    severity: "MAJOR",
    description: "Inibidores de CYP3A4 elevam risco de miopatia/rabdomiólise com estatinas.",
  },
  {
    patterns: [/levotiroxina|t4/i, /cálcio|ferro|sevelamer|sucralfato/i],
    severity: "MODERATE",
    description: "Separar administração — redução da absorção de levotiroxina.",
  },
  {
    patterns: [/clopidogrel/i, /omeprazol|esomeprazol/i],
    severity: "MODERATE",
    description: "IBP pode reduzir efeito antiplaquetário do clopidogrel.",
  },
];

function normalizeName(name: string): string {
  return name.trim().toLowerCase();
}

function matchesPattern(name: string, pattern: RegExp): boolean {
  return pattern.test(normalizeName(name));
}

export function checkDrugInteractions(medications: MedicationItem[]): InteractionResult[] {
  const names = medications.map((m) => m.name).filter(Boolean);
  const found: InteractionResult[] = [];
  const seen = new Set<string>();

  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      const a = names[i];
      const b = names[j];
      for (const rule of RULES) {
        const [p1, p2] = rule.patterns;
        const match =
          (matchesPattern(a, p1) && matchesPattern(b, p2)) ||
          (matchesPattern(a, p2) && matchesPattern(b, p1));
        if (!match) continue;
        const key = [a, b].sort().join("|") + rule.description;
        if (seen.has(key)) continue;
        seen.add(key);
        found.push({
          drugA: a,
          drugB: b,
          severity: rule.severity,
          description: rule.description,
        });
      }
    }
  }

  return found;
}

export function maxInteractionSeverity(
  interactions: InteractionResult[],
): "NONE" | "MINOR" | "MODERATE" | "MAJOR" | "CONTRAINDICATED" {
  const order = ["NONE", "MINOR", "MODERATE", "MAJOR", "CONTRAINDICATED"] as const;
  let max = 0;
  for (const ix of interactions) {
    const idx = order.indexOf(ix.severity);
    if (idx > max) max = idx;
  }
  return order[max];
}
