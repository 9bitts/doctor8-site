// WHO Child Growth Standards ? LMS reference tables (subset for 0?60 months).
// Source: WHO 2006 standards (weight/length/head circumference for age).

export type GrowthChartType = "wfa" | "lhfa" | "hcfa";
export type GrowthSex = "M" | "F";

export type LmsRow = { ageMonths: number; L: number; M: number; S: number };

type GrowthTables = Record<GrowthSex, Record<GrowthChartType, LmsRow[]>>;

/** Boys ? weight-for-age (kg). */
const BOYS_WFA: LmsRow[] = [
  { ageMonths: 0, L: 0.3487, M: 3.3464, S: 0.14602 },
  { ageMonths: 1, L: 0.2297, M: 4.4709, S: 0.13395 },
  { ageMonths: 2, L: 0.197, M: 5.5675, S: 0.12385 },
  { ageMonths: 3, L: 0.1738, M: 6.3762, S: 0.11727 },
  { ageMonths: 6, L: 0.1257, M: 7.934, S: 0.10958 },
  { ageMonths: 9, L: 0.09177, M: 8.9391, S: 0.10407 },
  { ageMonths: 12, L: 0.0644, M: 9.6479, S: 0.10014 },
  { ageMonths: 18, L: 0.0402, M: 10.9506, S: 0.0964 },
  { ageMonths: 24, L: -0.0131, M: 12.2315, S: 0.09452 },
  { ageMonths: 36, L: -0.0403, M: 14.3379, S: 0.09153 },
  { ageMonths: 48, L: -0.0564, M: 16.3309, S: 0.08976 },
  { ageMonths: 60, L: -0.0631, M: 18.3073, S: 0.08885 },
];

const GIRLS_WFA: LmsRow[] = [
  { ageMonths: 0, L: 0.3809, M: 3.2322, S: 0.14171 },
  { ageMonths: 1, L: 0.2458, M: 4.1873, S: 0.13724 },
  { ageMonths: 2, L: 0.2024, M: 5.1282, S: 0.13127 },
  { ageMonths: 3, L: 0.1732, M: 5.8458, S: 0.12619 },
  { ageMonths: 6, L: 0.1177, M: 7.297, S: 0.11727 },
  { ageMonths: 9, L: 0.08627, M: 8.2351, S: 0.11316 },
  { ageMonths: 12, L: 0.0608, M: 8.9481, S: 0.1108 },
  { ageMonths: 18, L: 0.0352, M: 10.2341, S: 0.10853 },
  { ageMonths: 24, L: -0.0056, M: 11.5358, S: 0.10752 },
  { ageMonths: 36, L: -0.038, M: 13.7412, S: 0.1061 },
  { ageMonths: 48, L: -0.0561, M: 15.7774, S: 0.10574 },
  { ageMonths: 60, L: -0.0679, M: 17.7763, S: 0.10604 },
];

const BOYS_LHFA: LmsRow[] = [
  { ageMonths: 0, L: 1, M: 49.8842, S: 0.03795 },
  { ageMonths: 1, L: 1, M: 54.7244, S: 0.03557 },
  { ageMonths: 3, L: 1, M: 61.4292, S: 0.03328 },
  { ageMonths: 6, L: 1, M: 67.6236, S: 0.03204 },
  { ageMonths: 9, L: 1, M: 71.9687, S: 0.03165 },
  { ageMonths: 12, L: 1, M: 75.7488, S: 0.03134 },
  { ageMonths: 18, L: 1, M: 82.2505, S: 0.03185 },
  { ageMonths: 24, L: 1, M: 87.7743, S: 0.03237 },
  { ageMonths: 36, L: 1, M: 96.2521, S: 0.03392 },
  { ageMonths: 48, L: 1, M: 103.3589, S: 0.03552 },
  { ageMonths: 60, L: 1, M: 110.0023, S: 0.03787 },
];

const GIRLS_LHFA: LmsRow[] = [
  { ageMonths: 0, L: 1, M: 49.1477, S: 0.0379 },
  { ageMonths: 1, L: 1, M: 53.6872, S: 0.0364 },
  { ageMonths: 3, L: 1, M: 60.5213, S: 0.03452 },
  { ageMonths: 6, L: 1, M: 66.7642, S: 0.03338 },
  { ageMonths: 9, L: 1, M: 71.2302, S: 0.03282 },
  { ageMonths: 12, L: 1, M: 74.0157, S: 0.0324 },
  { ageMonths: 18, L: 1, M: 80.729, S: 0.03254 },
  { ageMonths: 24, L: 1, M: 86.4153, S: 0.03279 },
  { ageMonths: 36, L: 1, M: 95.0907, S: 0.03412 },
  { ageMonths: 48, L: 1, M: 102.3678, S: 0.036 },
  { ageMonths: 60, L: 1, M: 108.9693, S: 0.03852 },
];

const BOYS_HCFA: LmsRow[] = [
  { ageMonths: 0, L: 1, M: 34.4618, S: 0.03686 },
  { ageMonths: 1, L: 1, M: 37.5589, S: 0.03295 },
  { ageMonths: 3, L: 1, M: 40.5777, S: 0.03042 },
  { ageMonths: 6, L: 1, M: 43.3306, S: 0.02873 },
  { ageMonths: 9, L: 1, M: 45.5043, S: 0.02795 },
  { ageMonths: 12, L: 1, M: 46.0642, S: 0.02731 },
  { ageMonths: 18, L: 1, M: 47.4922, S: 0.02714 },
  { ageMonths: 24, L: 1, M: 48.3222, S: 0.02762 },
  { ageMonths: 36, L: 1, M: 49.6726, S: 0.02811 },
  { ageMonths: 48, L: 1, M: 50.3872, S: 0.0284 },
  { ageMonths: 60, L: 1, M: 50.6519, S: 0.02846 },
];

const GIRLS_HCFA: LmsRow[] = [
  { ageMonths: 0, L: 1, M: 33.8787, S: 0.03496 },
  { ageMonths: 1, L: 1, M: 36.9733, S: 0.032 },
  { ageMonths: 3, L: 1, M: 39.8531, S: 0.02997 },
  { ageMonths: 6, L: 1, M: 42.7271, S: 0.02846 },
  { ageMonths: 9, L: 1, M: 44.753, S: 0.02777 },
  { ageMonths: 12, L: 1, M: 44.8362, S: 0.02749 },
  { ageMonths: 18, L: 1, M: 46.4202, S: 0.02723 },
  { ageMonths: 24, L: 1, M: 47.3831, S: 0.0272 },
  { ageMonths: 36, L: 1, M: 48.8471, S: 0.02745 },
  { ageMonths: 48, L: 1, M: 49.5135, S: 0.02762 },
  { ageMonths: 60, L: 1, M: 49.8354, S: 0.02777 },
];

const TABLES: GrowthTables = {
  M: { wfa: BOYS_WFA, lhfa: BOYS_LHFA, hcfa: BOYS_HCFA },
  F: { wfa: GIRLS_WFA, lhfa: GIRLS_LHFA, hcfa: GIRLS_HCFA },
};

export const GROWTH_CHART_META: Record<GrowthChartType, { labelKey: string; unit: string; maxAgeMonths: number; valueKey: "weightKg" | "heightCm" | "headCircumferenceCm" }> = {
  wfa: { labelKey: "growth.chart.wfa", unit: "kg", maxAgeMonths: 60, valueKey: "weightKg" },
  lhfa: { labelKey: "growth.chart.lhfa", unit: "cm", maxAgeMonths: 60, valueKey: "heightCm" },
  hcfa: { labelKey: "growth.chart.hcfa", unit: "cm", maxAgeMonths: 60, valueKey: "headCircumferenceCm" },
};

export const PERCENTILE_LINES = [
  { z: -1.881, label: "P3" },
  { z: 0, label: "P50" },
  { z: 1.881, label: "P97" },
];

export function normalizeGrowthSex(sex?: string | null): GrowthSex {
  return sex === "F" ? "F" : "M";
}

export function ageInMonths(dateOfBirth: string, at: Date): number {
  const [y, m, d] = dateOfBirth.split("-").map(Number);
  const birth = new Date(y, m - 1, d);
  const months = (at.getFullYear() - birth.getFullYear()) * 12
    + (at.getMonth() - birth.getMonth())
    + (at.getDate() - birth.getDate()) / 30.4375;
  return Math.max(0, Math.round(months * 10) / 10);
}

function interpolateLms(table: LmsRow[], ageMonths: number): LmsRow {
  if (ageMonths <= table[0].ageMonths) return table[0];
  if (ageMonths >= table[table.length - 1].ageMonths) return table[table.length - 1];
  for (let i = 0; i < table.length - 1; i++) {
    const a = table[i];
    const b = table[i + 1];
    if (ageMonths >= a.ageMonths && ageMonths <= b.ageMonths) {
      const t = (ageMonths - a.ageMonths) / (b.ageMonths - a.ageMonths);
      return {
        ageMonths,
        L: a.L + t * (b.L - a.L),
        M: a.M + t * (b.M - a.M),
        S: a.S + t * (b.S - a.S),
      };
    }
  }
  return table[table.length - 1];
}

export function getLms(sex: GrowthSex, chart: GrowthChartType, ageMonths: number): LmsRow {
  const table = TABLES[sex][chart];
  return interpolateLms(table, Math.min(ageMonths, GROWTH_CHART_META[chart].maxAgeMonths));
}

export function lmsZScore(value: number, L: number, M: number, S: number): number {
  if (value <= 0 || M <= 0) return NaN;
  if (Math.abs(L) < 0.0001) return Math.log(value / M) / S;
  return (Math.pow(value / M, L) - 1) / (L * S);
}

export function lmsValueFromZ(z: number, L: number, M: number, S: number): number {
  if (Math.abs(L) < 0.0001) return M * Math.exp(S * z);
  return M * Math.pow(1 + L * S * z, 1 / L);
}

/** Normal CDF approximation ? returns percentile 0?100. */
export function zToPercentile(z: number): number {
  if (!Number.isFinite(z)) return NaN;
  const abs = Math.abs(z);
  const t = 1 / (1 + 0.2316419 * abs);
  const d = 0.3989423 * Math.exp(-abs * abs / 2);
  const p = d * t * (0.3193815 + t * (-0.3565638 + t * (1.781478 + t * (-1.821256 + t * 1.330274))));
  const cdf = z >= 0 ? 1 - p : p;
  return Math.round(cdf * 1000) / 10;
}

export function evaluateMeasurement(
  sex: GrowthSex,
  chart: GrowthChartType,
  ageMonths: number,
  value: number,
): { zScore: number; percentile: number } {
  const { L, M, S } = getLms(sex, chart, ageMonths);
  const zScore = lmsZScore(value, L, M, S);
  return { zScore: Math.round(zScore * 100) / 100, percentile: zToPercentile(zScore) };
}

export function buildPercentileCurve(
  sex: GrowthSex,
  chart: GrowthChartType,
  z: number,
  maxAge = 60,
  step = 1,
): { ageMonths: number; value: number }[] {
  const points: { ageMonths: number; value: number }[] = [];
  for (let age = 0; age <= maxAge; age += step) {
    const { L, M, S } = getLms(sex, chart, age);
    points.push({ ageMonths: age, value: lmsValueFromZ(z, L, M, S) });
  }
  return points;
}
