// Deep links from an active video consult ? patient chart / emissions, with return URL.

export type VideoConsultKind = "appointment" | "jit" | "humanitarian";

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

export function chartRecordUrl(chartId: string, returnUrl: string, recordId: string): string {
  return withReturn(`/professional/patients/${chartId}`, returnUrl, { recordId });
}

export function chartTabUrl(chartId: string, returnUrl: string, tab: ChartTab): string {
  return withReturn(`/professional/patients/${chartId}`, returnUrl, { tab });
}

export function buildVideoChartLinks(
  chartId: string,
  returnUrl: string,
  isPsychoanalyst: boolean,
) {
  if (isPsychoanalyst) {
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

  return {
    fullChart: withReturn(`/professional/patients/${chartId}`, returnUrl),
    addRecord: withReturn(`/professional/patients/${chartId}`, returnUrl, { newRecord: "1" }),
    recordUrl: (recordId: string) => chartRecordUrl(chartId, returnUrl, recordId),
    vaccines: chartTabUrl(chartId, returnUrl, "vaccines"),
    dental: chartTabUrl(chartId, returnUrl, "dental"),
    evolution: chartTabUrl(chartId, returnUrl, "evolution"),
    diagnoses: chartTabUrl(chartId, returnUrl, "diagnoses"),
    prescribe: chartActionUrl("/professional/prescriptions", chartId, { view: "prescription", returnUrl }),
    exam: chartActionUrl("/professional/prescriptions", chartId, { view: "exam", returnUrl }),
    document: chartActionUrl("/professional/prescriptions", chartId, { view: "document", returnUrl }),
    psychSession: chartActionUrl("/professional/psychology/sessions", chartId, { view: "create", returnUrl }),
    psychScale: chartActionUrl("/professional/psychology/scales", chartId, { view: "apply", returnUrl }),
    psychDocument: chartActionUrl("/professional/psychology/documents", chartId, { returnUrl }),
  };
}
