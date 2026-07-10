export type ClinicalRecordKind = "ANAMNESIS" | "EVOLUTION" | "REPORT" | "OTHER";

export type RecordTimelineFilter =
  | "all"
  | "anamnesis"
  | "evolution"
  | "report"
  | "exam"
  | "prescription";

export const RECORD_KIND_OPTIONS: ClinicalRecordKind[] = [
  "ANAMNESIS",
  "EVOLUTION",
  "REPORT",
  "OTHER",
];

export const TIMELINE_FILTERS: RecordTimelineFilter[] = [
  "all",
  "anamnesis",
  "evolution",
  "report",
  "exam",
  "prescription",
];

export function recordKindLabelKey(kind: ClinicalRecordKind): string {
  return `kind.${kind.toLowerCase()}`;
}

export function timelineFilterLabelKey(filter: RecordTimelineFilter): string {
  return `timeline.filter.${filter}`;
}

export function matchesTimelineFilter(
  doc: { type: string; recordKind?: ClinicalRecordKind | string | null },
  filter: RecordTimelineFilter,
): boolean {
  if (filter === "all") return true;
  if (filter === "anamnesis") return doc.recordKind === "ANAMNESIS";
  if (filter === "evolution") return doc.recordKind === "EVOLUTION";
  if (filter === "report") return doc.recordKind === "REPORT";
  if (filter === "exam") {
    return doc.type === "EXAM_REQUEST" || doc.type === "EXAM_RESULT";
  }
  if (filter === "prescription") return doc.type === "PRESCRIPTION";
  return true;
}

export function kindBadgeClass(kind: ClinicalRecordKind | string | null | undefined): string {
  switch (kind) {
    case "ANAMNESIS":
      return "bg-accent-50 text-accent-700 border-accent-200";
    case "EVOLUTION":
      return "bg-sky-50 text-sky-700 border-sky-200";
    case "REPORT":
      return "bg-amber-50 text-amber-800 border-amber-200";
    default:
      return "bg-slate-50 text-slate-600 border-slate-200";
  }
}

export function suggestRecordKind(
  docs: { recordKind?: string | null }[],
): ClinicalRecordKind {
  const hasAnamnesis = docs.some((d) => d.recordKind === "ANAMNESIS");
  return hasAnamnesis ? "EVOLUTION" : "ANAMNESIS";
}

/** Infer timeline kind from category slug/name when the user picks only a category. */
export function inferRecordKindFromCategory(
  cat: { slug?: string | null; name?: string | null; legacyType?: string | null },
  docs: { recordKind?: string | null }[] = [],
): ClinicalRecordKind {
  const s = `${cat.slug || ""} ${cat.name || ""}`.toLowerCase();
  if (/anamnes/.test(s)) return "ANAMNESIS";
  if (/laudo|atestado|attest|report/.test(s)) return "REPORT";
  if (/evolu/.test(s)) return "EVOLUTION";
  if (cat.legacyType === "CERTIFICATE") return "REPORT";
  return suggestRecordKind(docs);
}

export function findPinnedAnamnesis<T extends { id: string; recordKind?: string | null; createdAt: string }>(
  docs: T[],
): T | null {
  const anamneses = docs.filter((d) => d.recordKind === "ANAMNESIS");
  if (anamneses.length === 0) return null;
  return anamneses.reduce((oldest, d) =>
    new Date(d.createdAt) < new Date(oldest.createdAt) ? d : oldest,
  );
}
