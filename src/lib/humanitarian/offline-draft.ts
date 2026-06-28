const PREFIX = "doctor8:hum:draft:";

type DraftEnvelope<T> = {
  savedAt: number;
  data: T;
};

export function humanitarianDraftKey(kind: "triage" | "anamnese", campaignSlug: string): string {
  return `${kind}:${campaignSlug}`;
}

export function saveHumanitarianDraft<T>(key: string, data: T): void {
  if (typeof window === "undefined") return;
  try {
    const envelope: DraftEnvelope<T> = { savedAt: Date.now(), data };
    localStorage.setItem(PREFIX + key, JSON.stringify(envelope));
  } catch {
    /* quota or private mode */
  }
}

export function loadHumanitarianDraft<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as DraftEnvelope<T>;
    return envelope.data ?? null;
  } catch {
    return null;
  }
}

export function clearHumanitarianDraft(key: string): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(PREFIX + key);
  } catch {
    /* ignore */
  }
}

export function humanitarianDraftSavedAt(key: string): number | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (!raw) return null;
    const envelope = JSON.parse(raw) as DraftEnvelope<unknown>;
    return envelope.savedAt ?? null;
  } catch {
    return null;
  }
}

const QUEUE_CACHE_PREFIX = "doctor8:hum:queue:";

export function cacheHumanitarianQueueState(campaignSlug: string, state: unknown): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      QUEUE_CACHE_PREFIX + campaignSlug,
      JSON.stringify({ savedAt: Date.now(), state }),
    );
  } catch {
    /* ignore */
  }
}

export function loadCachedHumanitarianQueueState<T>(campaignSlug: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(QUEUE_CACHE_PREFIX + campaignSlug);
    if (!raw) return null;
    return (JSON.parse(raw) as { state: T }).state ?? null;
  } catch {
    return null;
  }
}

const VOLUNTEER_CACHE_KEY = "doctor8:hum:volunteer:dash";

export function cacheVolunteerDashboard(state: unknown): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(
      VOLUNTEER_CACHE_KEY,
      JSON.stringify({ savedAt: Date.now(), state }),
    );
  } catch {
    /* ignore */
  }
}

export function loadCachedVolunteerDashboard<T>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(VOLUNTEER_CACHE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as { state: T }).state ?? null;
  } catch {
    return null;
  }
}

const ANGEL_CACHE_KEY = "doctor8:hum:angel:dash";

export function cacheAngelDashboard(state: unknown): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(ANGEL_CACHE_KEY, JSON.stringify({ savedAt: Date.now(), state }));
  } catch {
    /* ignore */
  }
}

export function loadCachedAngelDashboard<T>(): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(ANGEL_CACHE_KEY);
    if (!raw) return null;
    return (JSON.parse(raw) as { state: T }).state ?? null;
  } catch {
    return null;
  }
}
