// Audiometry helpers (Phase 8D) ? thresholds in dB HL.

export const AUDIO_FREQS = [250, 500, 1000, 2000, 4000, 8000] as const;
export type AudioFreq = (typeof AUDIO_FREQS)[number];

export type ConductionMap = Partial<Record<string, number>>;

export type EarThresholds = {
  ac?: ConductionMap;
  bc?: ConductionMap;
};

export type AudiogramThresholds = {
  right: EarThresholds;
  left: EarThresholds;
};

export type HearingGrade =
  | "NORMAL"
  | "MILD"
  | "MODERATE"
  | "SEVERE"
  | "PROFOUND";

const FREQ_KEYS = AUDIO_FREQS.map(String);

function clampDb(v: number): number {
  if (v < -10) return -10;
  if (v > 120) return 120;
  return Math.round(v);
}

function parseConduction(raw: unknown): ConductionMap | undefined {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return undefined;
  const out: ConductionMap = {};
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!FREQ_KEYS.includes(k)) continue;
    const n = Number(v);
    if (!Number.isFinite(n)) continue;
    out[k] = clampDb(n);
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function parseEar(raw: unknown): EarThresholds {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const o = raw as Record<string, unknown>;
  const ac = parseConduction(o.ac);
  const bc = parseConduction(o.bc);
  return {
    ...(ac ? { ac } : {}),
    ...(bc ? { bc } : {}),
  };
}

export function parseAudiogramThresholds(raw: unknown): AudiogramThresholds {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return { right: {}, left: {} };
  }
  const o = raw as Record<string, unknown>;
  return {
    right: parseEar(o.right),
    left: parseEar(o.left),
  };
}

export function emptyThresholds(): AudiogramThresholds {
  return { right: { ac: {} }, left: { ac: {} } };
}

/** Pure-tone average: 500, 1k, 2k, 4k Hz (AC). */
export function computePta(ear: EarThresholds): number | null {
  const ac = ear.ac;
  if (!ac) return null;
  const vals = ["500", "1000", "2000", "4000"]
    .map((f) => ac[f])
    .filter((v): v is number => v != null && Number.isFinite(v));
  if (vals.length < 3) return null;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}

export function classifyHearing(pta: number | null): HearingGrade | null {
  if (pta == null) return null;
  if (pta <= 25) return "NORMAL";
  if (pta <= 40) return "MILD";
  if (pta <= 60) return "MODERATE";
  if (pta <= 80) return "SEVERE";
  return "PROFOUND";
}

export function hasAnyThreshold(t: AudiogramThresholds): boolean {
  for (const ear of [t.right, t.left]) {
    for (const map of [ear.ac, ear.bc]) {
      if (map && Object.keys(map).length > 0) return true;
    }
  }
  return false;
}

export function chartPoints(
  ear: EarThresholds,
  conduction: "ac" | "bc",
): { freq: AudioFreq; db: number }[] {
  const map = conduction === "ac" ? ear.ac : ear.bc;
  if (!map) return [];
  return AUDIO_FREQS.filter((f) => map[String(f)] != null).map((f) => ({
    freq: f,
    db: map[String(f)]!,
  }));
}
