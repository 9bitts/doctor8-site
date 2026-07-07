// Periodontogram helpers — 6-site charting per tooth (MB, B, DB, ML, L, DL).

export type PerioSite = "MB" | "B" | "DB" | "ML" | "L" | "DL";

export type PerioSiteReading = {
  depth?: number;
  bleeding?: boolean;
  plaque?: boolean;
};

export type PerioToothReading = {
  sites: Partial<Record<PerioSite, PerioSiteReading>>;
  mobility?: 0 | 1 | 2 | 3;
  recession?: number;
};

export type PeriodontogramData = Record<string, PerioToothReading>;

export const PERIO_SITES: PerioSite[] = ["MB", "B", "DB", "ML", "L", "DL"];

export const PERIO_ARCHES: { labelKey: string; teeth: number[] }[] = [
  {
    labelKey: "odonto.arch.upper",
    teeth: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  },
  {
    labelKey: "odonto.arch.lower",
    teeth: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
  },
];

export function parsePeriodontogramTeeth(raw: unknown): PeriodontogramData {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: PeriodontogramData = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    const o = val as Record<string, unknown>;
    const sites: Partial<Record<PerioSite, PerioSiteReading>> = {};
    if (o.sites && typeof o.sites === "object" && !Array.isArray(o.sites)) {
      for (const [sk, sv] of Object.entries(o.sites as Record<string, unknown>)) {
        if (!PERIO_SITES.includes(sk as PerioSite)) continue;
        if (!sv || typeof sv !== "object" || Array.isArray(sv)) continue;
        const s = sv as Record<string, unknown>;
        sites[sk as PerioSite] = {
          ...(typeof s.depth === "number" ? { depth: Math.min(15, Math.max(0, s.depth)) } : {}),
          ...(typeof s.bleeding === "boolean" ? { bleeding: s.bleeding } : {}),
          ...(typeof s.plaque === "boolean" ? { plaque: s.plaque } : {}),
        };
      }
    }
    out[key] = {
      sites,
      ...(typeof o.mobility === "number" ? { mobility: Math.min(3, Math.max(0, o.mobility)) as 0 | 1 | 2 | 3 } : {}),
      ...(typeof o.recession === "number" ? { recession: o.recession } : {}),
    };
  }
  return out;
}

export function countBleedingSites(data: PeriodontogramData): number {
  let count = 0;
  for (const tooth of Object.values(data)) {
    for (const site of Object.values(tooth.sites ?? {})) {
      if (site.bleeding) count++;
    }
  }
  return count;
}

export function avgPocketDepth(data: PeriodontogramData): number | null {
  const depths: number[] = [];
  for (const tooth of Object.values(data)) {
    for (const site of Object.values(tooth.sites ?? {})) {
      if (typeof site.depth === "number") depths.push(site.depth);
    }
  }
  if (depths.length === 0) return null;
  return Math.round((depths.reduce((a, b) => a + b, 0) / depths.length) * 10) / 10;
}
