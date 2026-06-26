// Clinical calculator helpers (Phase 4).

import { computeBmi } from "@/lib/clinical-metrics";

export type BmiCategory =
  | "underweight"
  | "normal"
  | "overweight"
  | "obesity1"
  | "obesity2"
  | "obesity3";

export function classifyBmi(bmi: number): BmiCategory {
  if (bmi < 18.5) return "underweight";
  if (bmi < 25) return "normal";
  if (bmi < 30) return "overweight";
  if (bmi < 35) return "obesity1";
  if (bmi < 40) return "obesity2";
  return "obesity3";
}

export function bmiCategoryLabelKey(cat: BmiCategory): string {
  return `calc.bmi.${cat}`;
}

export function computeBmiResult(weightKg: number, heightCm: number): {
  bmi: number;
  category: BmiCategory;
} | null {
  const bmi = computeBmi(weightKg, heightCm);
  if (bmi == null) return null;
  return { bmi, category: classifyBmi(bmi) };
}

/** Naegele's rule: LMP + 280 days */
export function computeEddFromLmp(lmp: Date): Date {
  const edd = new Date(lmp);
  edd.setDate(edd.getDate() + 280);
  return edd;
}

export function computeGestationalAge(lmp: Date, referenceDate: Date = new Date()): {
  weeks: number;
  days: number;
  totalDays: number;
} | null {
  const start = new Date(lmp);
  start.setHours(0, 0, 0, 0);
  const ref = new Date(referenceDate);
  ref.setHours(0, 0, 0, 0);
  const diffMs = ref.getTime() - start.getTime();
  if (diffMs < 0) return null;
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  const weeks = Math.floor(totalDays / 7);
  const days = totalDays % 7;
  return { weeks, days, totalDays };
}

export function parseIsoDate(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatIsoDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}
