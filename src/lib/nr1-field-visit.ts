/** Mobile field visit checklist for AEP/AET-lite (NR-17). */

export type FieldVisitCheckItem = {
  id: string;
  label: string;
  done: boolean;
  note?: string;
};

export type FieldVisitPhoto = {
  key: string;
  caption?: string;
  uploadedAt: string;
};

export type FieldVisitData = {
  version: 1;
  startedAt?: string;
  taskObserved?: string;
  workerInterview?: string;
  organizationNotes?: string;
  checklist: FieldVisitCheckItem[];
};

export const DEFAULT_FIELD_VISIT_CHECKLIST: Omit<FieldVisitCheckItem, "done" | "note">[] = [
  { id: "observe_task", label: "Observei a tarefa sendo executada no posto" },
  { id: "posture", label: "Avaliei posturas (sentado/em pé/tronco/ombros)" },
  { id: "reach_force", label: "Avaliei alcances, forças e manipulação de cargas" },
  { id: "repetition_pace", label: "Avaliei ritmos, repetitividade e pausas reais" },
  { id: "tools_furniture", label: "Avaliei ferramentas, mobiliário e layout" },
  { id: "lighting_env", label: "Avaliei iluminação, reflexos e ambiente geral" },
  { id: "org_pressure", label: "Avaliei pressão de metas / organização do trabalho" },
  { id: "worker_heard", label: "Ouvi o(s) trabalhador(es) sobre queixas e dificuldades" },
  { id: "photos", label: "Registrei fotos do posto (quando permitido)" },
  { id: "psychosocial", label: "Considerei fatores psicossociais ligados ao posto" },
];

export function defaultFieldVisit(partial?: Partial<FieldVisitData>): FieldVisitData {
  const byId = new Map((partial?.checklist ?? []).map((c) => [c.id, c]));
  return {
    version: 1,
    startedAt: partial?.startedAt ?? new Date().toISOString(),
    taskObserved: partial?.taskObserved ?? "",
    workerInterview: partial?.workerInterview ?? "",
    organizationNotes: partial?.organizationNotes ?? "",
    // Always merge against the canonical checklist so clients cannot drop items.
    checklist: DEFAULT_FIELD_VISIT_CHECKLIST.map((c) => {
      const found = byId.get(c.id);
      return found
        ? { ...c, done: Boolean(found.done), note: found.note }
        : { ...c, done: false };
    }),
  };
}

export function parseFieldVisit(raw: unknown): FieldVisitData {
  if (!raw || typeof raw !== "object") return defaultFieldVisit();
  const o = raw as Partial<FieldVisitData>;
  const base = defaultFieldVisit();
  const byId = new Map((o.checklist ?? []).map((c) => [c.id, c]));
  return {
    version: 1,
    startedAt: o.startedAt ?? base.startedAt,
    taskObserved: o.taskObserved ?? "",
    workerInterview: o.workerInterview ?? "",
    organizationNotes: o.organizationNotes ?? "",
    checklist: base.checklist.map((c) => {
      const found = byId.get(c.id);
      return found
        ? { ...c, done: Boolean(found.done), note: found.note }
        : c;
    }),
  };
}

export function parsePhotoKeys(raw: unknown): FieldVisitPhoto[] {
  if (!Array.isArray(raw)) return [];
  return raw.filter(
    (p): p is FieldVisitPhoto =>
      !!p && typeof p === "object" && typeof (p as FieldVisitPhoto).key === "string",
  );
}

export function fieldVisitProgress(visit: FieldVisitData): { done: number; total: number; percent: number } {
  const total = visit.checklist.length;
  const done = visit.checklist.filter((c) => c.done).length;
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}
