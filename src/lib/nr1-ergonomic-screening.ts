/** Semiquantitative ergonomic screening for AEP (NR-17) — not a full AET. */

export type ErgonomicRepetitionBand =
  | "NONE"
  | "LOW"
  | "ATTENTION"
  | "SIGNIFICANT"
  | "HIGH";

export type ErgonomicLoadBand = "NONE" | "LOW" | "ATTENTION" | "MODERATE" | "SIGNIFICANT";

export type ErgonomicScreeningInput = {
  workstationDescription?: string;
  repetitionsPerShift?: number | null;
  loadKg?: number | null;
  armsAboveShoulders?: boolean;
  trunkFlexionFrequent?: boolean;
  wristForceDeviation?: boolean;
  vibrationTools?: boolean;
  prolongedStanding?: boolean;
  computerWorkstation?: boolean;
  notes?: string;
};

export type ErgonomicScreeningResult = ErgonomicScreeningInput & {
  version: 1;
  repetitionBand: ErgonomicRepetitionBand;
  loadBand: ErgonomicLoadBand;
  riskFlags: string[];
  recommendAet: boolean;
  summary: string;
};

export function classifyRepetitions(n: number | null | undefined): ErgonomicRepetitionBand {
  if (n == null || Number.isNaN(n)) return "NONE";
  if (n < 1000) return "NONE";
  if (n <= 2000) return "LOW";
  if (n <= 2500) return "ATTENTION";
  if (n <= 3000) return "SIGNIFICANT";
  return "HIGH";
}

export function classifyLoadKg(kg: number | null | undefined): ErgonomicLoadBand {
  if (kg == null || Number.isNaN(kg)) return "NONE";
  if (kg < 5) return "NONE";
  if (kg <= 10) return "LOW";
  if (kg <= 20) return "ATTENTION";
  if (kg <= 25) return "MODERATE";
  return "SIGNIFICANT";
}

const REPETITION_LABEL: Record<ErgonomicRepetitionBand, string> = {
  NONE: "Sem risco ergonômico significativo por repetitividade",
  LOW: "Baixa probabilidade de risco por repetitividade",
  ATTENTION: "Atenção: verificar força, postura e pausas",
  SIGNIFICANT: "Risco ergonômico significativo (repetitividade)",
  HIGH: "Alto risco ergonômico (repetitividade)",
};

const LOAD_LABEL: Record<ErgonomicLoadBand, string> = {
  NONE: "Sem risco significativo por carga",
  LOW: "Baixo risco por carga",
  ATTENTION: "Atenção ergonômica (carga)",
  MODERATE: "Risco moderado por carga",
  SIGNIFICANT: "Risco ergonômico significativo (>25 kg)",
};

export function buildErgonomicScreening(input: ErgonomicScreeningInput): ErgonomicScreeningResult {
  const repetitionBand = classifyRepetitions(input.repetitionsPerShift ?? null);
  const loadBand = classifyLoadKg(input.loadKg ?? null);
  const riskFlags: string[] = [];

  if (repetitionBand === "ATTENTION" || repetitionBand === "SIGNIFICANT" || repetitionBand === "HIGH") {
    riskFlags.push(REPETITION_LABEL[repetitionBand]);
  }
  if (loadBand === "ATTENTION" || loadBand === "MODERATE" || loadBand === "SIGNIFICANT") {
    riskFlags.push(LOAD_LABEL[loadBand]);
  }
  if (input.armsAboveShoulders) riskFlags.push("Braços acima da linha dos ombros");
  if (input.trunkFlexionFrequent) riskFlags.push("Trabalho curvado / flexão de tronco frequente");
  if (input.wristForceDeviation) riskFlags.push("Desvio de punho com força / alta repetitividade manual");
  if (input.vibrationTools) riskFlags.push("Ferramentas vibratórias");
  if (input.prolongedStanding) riskFlags.push("Permanência prolongada em pé");
  if (input.computerWorkstation) riskFlags.push("Posto informatizado — verificar altura de monitor/teclado e micropausas");

  const recommendAet =
    repetitionBand === "HIGH" ||
    loadBand === "SIGNIFICANT" ||
    riskFlags.length >= 3 ||
    (repetitionBand === "SIGNIFICANT" && loadBand !== "NONE");

  const summary =
    riskFlags.length === 0
      ? "Triagem ergonômica sem flags relevantes; manter medidas preventivas básicas e revisar periodicamente."
      : `Flags: ${riskFlags.join("; ")}.${recommendAet ? " Recomenda-se aprofundar com AET quando houver inadequação persistente ou queixas no PCMSO." : ""}`;

  return {
    version: 1,
    workstationDescription: input.workstationDescription,
    repetitionsPerShift: input.repetitionsPerShift ?? null,
    loadKg: input.loadKg ?? null,
    armsAboveShoulders: Boolean(input.armsAboveShoulders),
    trunkFlexionFrequent: Boolean(input.trunkFlexionFrequent),
    wristForceDeviation: Boolean(input.wristForceDeviation),
    vibrationTools: Boolean(input.vibrationTools),
    prolongedStanding: Boolean(input.prolongedStanding),
    computerWorkstation: Boolean(input.computerWorkstation),
    notes: input.notes,
    repetitionBand,
    loadBand,
    riskFlags,
    recommendAet,
    summary,
  };
}

export function parseErgonomicScreening(raw: unknown): ErgonomicScreeningResult | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  if (o.version !== 1) return null;
  return o as ErgonomicScreeningResult;
}
