// Odontogram helpers ? FDI notation (ISO 3950), permanent dentition.

export type OdontogramCondition =
  | "HEALTHY"
  | "CARIES"
  | "RESTORATION"
  | "MISSING"
  | "CROWN"
  | "IMPLANT"
  | "ROOT_CANAL"
  | "FRACTURE"
  | "TO_EXTRACT";

export type ToothSurface = "M" | "O" | "D" | "V" | "L";

export type ToothState = {
  condition: OdontogramCondition;
  surfaces?: ToothSurface[];
  notes?: string;
};

export type OdontogramData = Record<string, ToothState>;

/** Dentist view: upper arch right?left, lower arch right?left. */
export const ODONTOGRAM_ARCHES: { labelKey: string; teeth: number[] }[] = [
  {
    labelKey: "odonto.arch.upper",
    teeth: [18, 17, 16, 15, 14, 13, 12, 11, 21, 22, 23, 24, 25, 26, 27, 28],
  },
  {
    labelKey: "odonto.arch.lower",
    teeth: [48, 47, 46, 45, 44, 43, 42, 41, 31, 32, 33, 34, 35, 36, 37, 38],
  },
];

export const ODONTOGRAM_CONDITIONS: OdontogramCondition[] = [
  "HEALTHY",
  "CARIES",
  "RESTORATION",
  "MISSING",
  "CROWN",
  "IMPLANT",
  "ROOT_CANAL",
  "FRACTURE",
  "TO_EXTRACT",
];

export const TOOTH_SURFACES: ToothSurface[] = ["M", "O", "D", "V", "L"];

export const CONDITION_STYLE: Record<
  OdontogramCondition,
  { bg: string; border: string; text: string; dot: string }
> = {
  HEALTHY: { bg: "bg-white", border: "border-slate-200", text: "text-slate-700", dot: "bg-slate-200" },
  CARIES: { bg: "bg-rose-50", border: "border-rose-300", text: "text-rose-800", dot: "bg-rose-500" },
  RESTORATION: { bg: "bg-sky-50", border: "border-sky-300", text: "text-sky-800", dot: "bg-sky-500" },
  MISSING: { bg: "bg-slate-100", border: "border-slate-300", text: "text-slate-400", dot: "bg-slate-400" },
  CROWN: { bg: "bg-amber-50", border: "border-amber-300", text: "text-amber-900", dot: "bg-amber-500" },
  IMPLANT: { bg: "bg-violet-50", border: "border-violet-300", text: "text-violet-800", dot: "bg-violet-500" },
  ROOT_CANAL: { bg: "bg-orange-50", border: "border-orange-300", text: "text-orange-900", dot: "bg-orange-500" },
  FRACTURE: { bg: "bg-fuchsia-50", border: "border-fuchsia-300", text: "text-fuchsia-800", dot: "bg-fuchsia-500" },
  TO_EXTRACT: { bg: "bg-red-50", border: "border-red-400", text: "text-red-800", dot: "bg-red-600" },
};

export function defaultToothState(): ToothState {
  return { condition: "HEALTHY", surfaces: [] };
}

export function getToothState(data: OdontogramData, tooth: number): ToothState {
  const key = String(tooth);
  return data[key] ?? defaultToothState();
}

export function parseOdontogramTeeth(raw: unknown): OdontogramData {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) return {};
  const out: OdontogramData = {};
  for (const [key, val] of Object.entries(raw as Record<string, unknown>)) {
    if (!val || typeof val !== "object" || Array.isArray(val)) continue;
    const o = val as Record<string, unknown>;
    const condition = o.condition;
    if (typeof condition !== "string" || !ODONTOGRAM_CONDITIONS.includes(condition as OdontogramCondition)) {
      continue;
    }
    const surfaces = Array.isArray(o.surfaces)
      ? o.surfaces.filter((s): s is ToothSurface =>
          typeof s === "string" && TOOTH_SURFACES.includes(s as ToothSurface),
        )
      : undefined;
    out[key] = {
      condition: condition as OdontogramCondition,
      ...(surfaces && surfaces.length > 0 ? { surfaces } : {}),
      ...(typeof o.notes === "string" && o.notes ? { notes: o.notes.slice(0, 500) } : {}),
    };
  }
  return out;
}

export function countByCondition(data: OdontogramData): Partial<Record<OdontogramCondition, number>> {
  const counts: Partial<Record<OdontogramCondition, number>> = {};
  for (const arch of ODONTOGRAM_ARCHES) {
    for (const tooth of arch.teeth) {
      const st = getToothState(data, tooth);
      if (st.condition === "HEALTHY") continue;
      counts[st.condition] = (counts[st.condition] ?? 0) + 1;
    }
  }
  return counts;
}
