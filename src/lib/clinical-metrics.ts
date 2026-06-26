// Clinical vitals / metrics helpers (Phase 2).

export type ClinicalMetricsInput = {
  weightKg?: number | null;
  heightCm?: number | null;
  systolicBp?: number | null;
  diastolicBp?: number | null;
  heartRate?: number | null;
  glucoseMgDl?: number | null;
  temperatureC?: number | null;
  spo2Percent?: number | null;
};

export type ClinicalMetricsSnapshot = ClinicalMetricsInput & {
  id: string;
  recordedAt: string;
  bmi?: number | null;
  documentId?: string | null;
};

export const METRIC_FIELDS = [
  { key: "weightKg" as const, labelKey: "metric.weight", unit: "kg", decimals: 1 },
  { key: "bmi" as const, labelKey: "metric.bmi", unit: "", decimals: 1 },
  { key: "systolicBp" as const, labelKey: "metric.systolic", unit: "mmHg", decimals: 0 },
  { key: "diastolicBp" as const, labelKey: "metric.diastolic", unit: "mmHg", decimals: 0 },
  { key: "heartRate" as const, labelKey: "metric.heartRate", unit: "bpm", decimals: 0 },
  { key: "glucoseMgDl" as const, labelKey: "metric.glucose", unit: "mg/dL", decimals: 0 },
  { key: "temperatureC" as const, labelKey: "metric.temperature", unit: "?C", decimals: 1 },
  { key: "spo2Percent" as const, labelKey: "metric.spo2", unit: "%", decimals: 0 },
];

export function computeBmi(weightKg?: number | null, heightCm?: number | null): number | null {
  if (weightKg == null || heightCm == null || heightCm <= 0) return null;
  const h = heightCm / 100;
  const bmi = weightKg / (h * h);
  if (!Number.isFinite(bmi)) return null;
  return Math.round(bmi * 10) / 10;
}

export function hasAnyMetric(m: ClinicalMetricsInput): boolean {
  return Object.values(m).some((v) => v != null && !Number.isNaN(Number(v)));
}

export function parseMetricsPayload(raw: unknown): ClinicalMetricsInput {
  if (!raw || typeof raw !== "object") return {};
  const o = raw as Record<string, unknown>;
  const num = (k: string) => {
    const v = o[k];
    if (v === "" || v == null) return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  };
  return {
    weightKg: num("weightKg"),
    heightCm: num("heightCm"),
    systolicBp: num("systolicBp") != null ? Math.round(num("systolicBp")!) : null,
    diastolicBp: num("diastolicBp") != null ? Math.round(num("diastolicBp")!) : null,
    heartRate: num("heartRate") != null ? Math.round(num("heartRate")!) : null,
    glucoseMgDl: num("glucoseMgDl"),
    temperatureC: num("temperatureC"),
    spo2Percent: num("spo2Percent") != null ? Math.round(num("spo2Percent")!) : null,
  };
}

export function formatMetricsSummary(m: ClinicalMetricsInput, bmi?: number | null): string {
  const parts: string[] = [];
  if (m.weightKg != null) parts.push(`${m.weightKg} kg`);
  if (bmi != null) parts.push(`IMC ${bmi}`);
  if (m.systolicBp != null && m.diastolicBp != null) {
    parts.push(`PA ${m.systolicBp}/${m.diastolicBp}`);
  }
  if (m.heartRate != null) parts.push(`FC ${m.heartRate}`);
  if (m.glucoseMgDl != null) parts.push(`Glic ${m.glucoseMgDl}`);
  if (m.temperatureC != null) parts.push(`${m.temperatureC}?C`);
  if (m.spo2Percent != null) parts.push(`SpO2 ${m.spo2Percent}%`);
  return parts.join(" ? ");
}
