import type { NursingScaleType } from "@prisma/client";

export type ScaleMeta = {
  type: NursingScaleType;
  labelKey: string;
  minScore: number;
  maxScore: number;
  riskLabelKey?: string;
};

export const NURSING_SCALES: ScaleMeta[] = [
  { type: "BRADEN", labelKey: "nurse.scale.braden", minScore: 6, maxScore: 23, riskLabelKey: "nurse.scale.bradenRisk" },
  { type: "MORSE", labelKey: "nurse.scale.morse", minScore: 0, maxScore: 125, riskLabelKey: "nurse.scale.morseRisk" },
  { type: "PAIN", labelKey: "nurse.scale.pain", minScore: 0, maxScore: 10 },
  { type: "GLASGOW", labelKey: "nurse.scale.glasgow", minScore: 3, maxScore: 15 },
];

export type BradenInput = {
  sensory: number;
  moisture: number;
  activity: number;
  mobility: number;
  nutrition: number;
  friction: number;
};

export function calcBradenScore(input: BradenInput): number {
  return input.sensory + input.moisture + input.activity + input.mobility + input.nutrition + input.friction;
}

export function bradenRiskLevel(score: number): "low" | "moderate" | "high" | "veryHigh" {
  if (score >= 19) return "low";
  if (score >= 15) return "moderate";
  if (score >= 13) return "high";
  return "veryHigh";
}

export type MorseInput = {
  historyOfFalling: number;
  secondaryDiagnosis: number;
  ambulatoryAid: number;
  ivTherapy: number;
  gait: number;
  mentalStatus: number;
};

export function calcMorseScore(input: MorseInput): number {
  return (
    input.historyOfFalling +
    input.secondaryDiagnosis +
    input.ambulatoryAid +
    input.ivTherapy +
    input.gait +
    input.mentalStatus
  );
}

export function morseRiskLevel(score: number): "low" | "high" {
  return score >= 45 ? "high" : "low";
}

export function calcPainScore(value: number): number {
  return Math.max(0, Math.min(10, Math.round(value)));
}

export type GlasgowInput = {
  eye: number;
  verbal: number;
  motor: number;
};

export function calcGlasgowScore(input: GlasgowInput): number {
  return input.eye + input.verbal + input.motor;
}

export function glasgowSeverity(score: number): "mild" | "moderate" | "severe" {
  if (score >= 13) return "mild";
  if (score >= 9) return "moderate";
  return "severe";
}

export function getScaleMeta(type: NursingScaleType): ScaleMeta | undefined {
  return NURSING_SCALES.find((s) => s.type === type);
}
