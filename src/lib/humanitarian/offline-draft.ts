const DRAFT_PREFIX = "doctor8:hum:draft:";
const QUEUE_PREFIX = "doctor8:hum:queue:";
const VOLUNTEER_PREFIX = "doctor8:hum:volunteer:";
const ANGEL_PREFIX = "doctor8:hum:angel:";

type DraftEnvelope<T> = {
  savedAt: number;
  data: T;
};

function draftStorageKey(userId: string, key: string): string {
  return `${DRAFT_PREFIX}${userId}:${key}`;
}

function queueStorageKey(userId: string, campaignSlug: string): string {
  return `${QUEUE_PREFIX}${userId}:${campaignSlug}`;
}

function volunteerStorageKey(userId: string): string {
  return `${VOLUNTEER_PREFIX}${userId}:dash`;
}

function angelStorageKey(userId: string): string {
  return `${ANGEL_PREFIX}${userId}:dash`;
}

/** Angel dashboard offline cache TTL (30 minutes). */
const ANGEL_CACHE_TTL_MS = 30 * 60 * 1000;

export type AngelDashboardCachePayload = {
  status: string;
  assignmentCount: number;
  maxPatients: number;
  myPatients: Array<{
    firstName: string;
    priority: string;
    poolLabel: string;
    consultEndedAt: string | null;
  }>;
  availableCount: number;
};

export function humanitarianDraftKey(kind: "triage" | "anamnese", campaignSlug: string): string {
  return `${kind}:${campaignSlug}`;
}

export function saveHumanitarianDraft<T>(userId: string, key: string, data: T): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    const envelope: DraftEnvelope<T> = { savedAt: Date.now(), data };
    localStorage.setItem(draftStorageKey(userId, key), JSON.stringify(envelope));
  } catch {
    /* quota or private mode */
  }
}

export function loadHumanitarianDraft<T>(userId: string, key: string): T | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(draftStorageKey(userId, key));
    if (!raw) return null;
    const envelope = JSON.parse(raw) as DraftEnvelope<T>;
    return envelope.data ?? null;
  } catch {
    return null;
  }
}

export function clearHumanitarianDraft(userId: string, key: string): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    localStorage.removeItem(draftStorageKey(userId, key));
  } catch {
    /* ignore */
  }
}

export function humanitarianDraftSavedAt(userId: string, key: string): number | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = localStorage.getItem(draftStorageKey(userId, key));
    if (!raw) return null;
    const envelope = JSON.parse(raw) as DraftEnvelope<unknown>;
    return envelope.savedAt ?? null;
  } catch {
    return null;
  }
}

export function cacheHumanitarianQueueState(
  userId: string,
  campaignSlug: string,
  state: unknown,
): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    sessionStorage.setItem(
      queueStorageKey(userId, campaignSlug),
      JSON.stringify({ savedAt: Date.now(), state }),
    );
  } catch {
    /* ignore */
  }
}

export function loadCachedHumanitarianQueueState<T>(
  userId: string,
  campaignSlug: string,
): T | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = sessionStorage.getItem(queueStorageKey(userId, campaignSlug));
    if (!raw) return null;
    return (JSON.parse(raw) as { state: T }).state ?? null;
  } catch {
    return null;
  }
}

export function cacheVolunteerDashboard(userId: string, state: unknown): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    sessionStorage.setItem(
      volunteerStorageKey(userId),
      JSON.stringify({ savedAt: Date.now(), state }),
    );
  } catch {
    /* ignore */
  }
}

export function loadCachedVolunteerDashboard<T>(userId: string): T | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = sessionStorage.getItem(volunteerStorageKey(userId));
    if (!raw) return null;
    return (JSON.parse(raw) as { state: T }).state ?? null;
  } catch {
    return null;
  }
}

export function cacheAngelDashboard(userId: string, state: AngelDashboardCachePayload): void {
  if (typeof window === "undefined" || !userId) return;
  try {
    sessionStorage.setItem(
      angelStorageKey(userId),
      JSON.stringify({ savedAt: Date.now(), state }),
    );
  } catch {
    /* ignore */
  }
}

export function loadCachedAngelDashboard<T = AngelDashboardCachePayload>(userId: string): T | null {
  if (typeof window === "undefined" || !userId) return null;
  try {
    const raw = sessionStorage.getItem(angelStorageKey(userId));
    if (!raw) return null;
    const envelope = JSON.parse(raw) as { savedAt: number; state: T };
    if (!envelope.savedAt || Date.now() - envelope.savedAt > ANGEL_CACHE_TTL_MS) {
      sessionStorage.removeItem(angelStorageKey(userId));
      return null;
    }
    return envelope.state ?? null;
  } catch {
    return null;
  }
}
