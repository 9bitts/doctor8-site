// Deep links from an active video consult ? patient chart / emissions, with return URL.

import { isPsychologistSpecialty } from "@/lib/psychologist-portal";

export type VideoConsultKind = "appointment" | "jit" | "humanitarian";

export type ProviderChartPanel =
  | "professional"
  | "psychologist"
  | "psychoanalyst"
  | "integrative_therapist";

export function providerPanelFromSpecialty(
  specialty: string | null | undefined,
): ProviderChartPanel {
  return isPsychologistSpecialty(specialty) ? "psychologist" : "professional";
}

export function providerAppointmentsPath(panel: ProviderChartPanel): string {
  switch (panel) {
    case "psychologist":
      return "/psychologist/appointments";
    case "psychoanalyst":
      return "/psychoanalyst/appointments";
    case "integrative_therapist":
      return "/integrative-therapist/appointments";
    default:
      return "/professional/appointments";
  }
}

export function providerJitPath(panel: ProviderChartPanel): string {
  return panel === "psychologist" ? "/psychologist/jit" : "/professional/jit";
}

export function providerPatientsPath(panel: ProviderChartPanel, chartId: string): string {
  switch (panel) {
    case "psychologist":
      return `/psychologist/patients/${chartId}`;
    case "psychoanalyst":
      return `/psychoanalyst/analysands/${chartId}`;
    case "integrative_therapist":
      return `/integrative-therapist/clients/${chartId}`;
    default:
      return `/professional/patients/${chartId}`;
  }
}

export interface VideoConsultContext {
  kind?: VideoConsultKind;
  appointmentId?: string | null;
  queueId?: string;
  entryId?: string;
}

export function videoReturnPath(ctx: VideoConsultContext): string {
  if (ctx.kind === "jit" && ctx.queueId) return `/video/jit/${ctx.queueId}`;
  if (ctx.kind === "humanitarian" && ctx.entryId) return `/video/humanitarian/${ctx.entryId}`;
  if (ctx.appointmentId) return `/video/${ctx.appointmentId}`;
  return "/professional/appointments";
}

export function readChartDeepLink(): {
  patientRecordId: string | null;
  returnUrl: string | null;
  view: string | null;
} {
  if (typeof window === "undefined") {
    return { patientRecordId: null, returnUrl: null, view: null };
  }
  const sp = new URLSearchParams(window.location.search);
  return {
    patientRecordId: sp.get("patientRecordId"),
    returnUrl: sp.get("returnUrl"),
    view: sp.get("view"),
  };
}

export function isConsultDeepLink(): boolean {
  const { patientRecordId, returnUrl } = readChartDeepLink();
  return !!(patientRecordId && returnUrl);
}

export interface ChartRecord {
  id: string;
  firstName: string;
  lastName: string;
  email?: string | null;
  hasAccount?: boolean;
}

export async function fetchChartById(chartId: string): Promise<ChartRecord | null> {
  const res = await fetch("/api/professional/records");
  const d = await res.json();
  const records: ChartRecord[] = d.records || [];
  return records.find((c) => c.id === chartId) || null;
}

export function chartActionUrl(
  path: string,
  chartId: string,
  opts?: { view?: string; returnUrl?: string; extra?: Record<string, string> },
): string {
  const sp = new URLSearchParams({ patientRecordId: chartId });
  if (opts?.view) sp.set("view", opts.view);
  if (opts?.returnUrl) sp.set("returnUrl", opts.returnUrl);
  if (opts?.extra) {
    for (const [k, v] of Object.entries(opts.extra)) sp.set(k, v);
  }
  return `${path}?${sp.toString()}`;
}

function withReturn(path: string, returnUrl: string, extra?: Record<string, string>): string {
  const sp = new URLSearchParams(extra);
  sp.set("returnUrl", returnUrl);
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

export type ChartTab =
  | "records"
  | "evolution"
  | "diagnoses"
  | "vaccines"
  | "growth"
  | "dental"
  | "audio";

export function chartRecordUrl(
  chartId: string,
  returnUrl: string,
  recordId: string,
  panel: ProviderChartPanel = "professional",
): string {
  return withReturn(providerPatientsPath(panel, chartId), returnUrl, { recordId });
}

export function chartTabUrl(
  chartId: string,
  returnUrl: string,
  tab: ChartTab,
  panel: ProviderChartPanel = "professional",
): string {
  return withReturn(providerPatientsPath(panel, chartId), returnUrl, { tab });
}

export function buildVideoChartLinks(
  chartId: string,
  returnUrl: string,
  panel: ProviderChartPanel = "professional",
) {
  if (panel === "psychologist") {
    const base = providerPatientsPath(panel, chartId);
    return {
      fullChart: withReturn(base, returnUrl),
      addRecord: withReturn(base, returnUrl, { newRecord: "1" }),
      recordUrl: (recordId: string) => chartRecordUrl(chartId, returnUrl, recordId, panel),
      vaccines: null as string | null,
      dental: null as string | null,
      evolution: chartTabUrl(chartId, returnUrl, "evolution", panel),
      diagnoses: null as string | null,
      prescribe: null as string | null,
      exam: null as string | null,
      document: null as string | null,
      psychSession: chartActionUrl("/psychologist/sessions", chartId, { view: "create", returnUrl }),
      psychScale: chartActionUrl("/psychologist/scales", chartId, { view: "apply", returnUrl }),
      psychDocument: chartActionUrl("/psychologist/documents", chartId, { returnUrl }),
    };
  }

  if (panel === "psychoanalyst") {
    const base = `/psychoanalyst/analysands/${chartId}`;
    return {
      fullChart: withReturn(base, returnUrl),
      addRecord: withReturn(base, returnUrl, { newRecord: "1" }),
      recordUrl: (_recordId: string) => withReturn(base, returnUrl),
      vaccines: null as string | null,
      dental: null as string | null,
      evolution: null as string | null,
      diagnoses: null as string | null,
      prescribe: null as string | null,
      exam: null as string | null,
      document: null as string | null,
      psychSession: null as string | null,
      psychScale: null as string | null,
      psychDocument: null as string | null,
    };
  }

  if (panel === "integrative_therapist") {
    const base = `/integrative-therapist/clients/${chartId}`;
    return {
      fullChart: withReturn(base, returnUrl),
      addRecord: withReturn(base, returnUrl, { newNote: "1" }),
      recordUrl: (_recordId: string) => withReturn(base, returnUrl),
      vaccines: null as string | null,
      dental: null as string | null,
      evolution: null as string | null,
      diagnoses: null as string | null,
      prescribe: chartActionUrl("/integrative-therapist/prescriptions", chartId, { view: "prescription", returnUrl }),
      exam: null as string | null,
      document: null as string | null,
      psychSession: null as string | null,
      psychScale: null as string | null,
      psychDocument: null as string | null,
    };
  }

  return {
    fullChart: withReturn(providerPatientsPath(panel, chartId), returnUrl),
    addRecord: withReturn(providerPatientsPath(panel, chartId), returnUrl, { newRecord: "1" }),
    recordUrl: (recordId: string) => chartRecordUrl(chartId, returnUrl, recordId, panel),
    vaccines: chartTabUrl(chartId, returnUrl, "vaccines", panel),
    dental: chartTabUrl(chartId, returnUrl, "dental", panel),
    evolution: chartTabUrl(chartId, returnUrl, "evolution", panel),
    diagnoses: chartTabUrl(chartId, returnUrl, "diagnoses", panel),
    prescribe: chartActionUrl("/professional/prescriptions", chartId, { view: "prescription", returnUrl }),
    exam: chartActionUrl("/professional/prescriptions", chartId, { view: "exam", returnUrl }),
    document: chartActionUrl("/professional/prescriptions", chartId, { view: "document", returnUrl }),
    psychSession: chartActionUrl("/professional/psychology/sessions", chartId, { view: "create", returnUrl }),
    psychScale: chartActionUrl("/professional/psychology/scales", chartId, { view: "apply", returnUrl }),
    psychDocument: chartActionUrl("/professional/psychology/documents", chartId, { returnUrl }),
  };
}
