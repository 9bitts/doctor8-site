const LOCAL_STORAGE_PREFIXES = [
  "doctor8:record-draft:",
  "doctor8:recordDraft:",
  "doctor8:hum:",
  "doctor8.patient.checklist.",
  "doctor8.pro.checklist.",
] as const;

const SESSION_STORAGE_PREFIXES = ["doctor8:hum:"] as const;

const SESSION_STORAGE_EXACT_KEYS = ["doctor8.authCallback"] as const;

const SCOPE_COOKIES = [
  "doctor8_org_provider",
  "doctor8_org_professional",
  "doctor8_pro_scope",
] as const;

const DRAFT_STORAGE_PREFIXES = ["doctor8:record-draft:", "doctor8:recordDraft:", "doctor8:hum:"] as const;

const HUM_STORAGE_PREFIX = "doctor8:hum:";
const HUM_DRAFT_KINDS = new Set(["triage", "anamnese"]);

function expireCookie(name: string): void {
  if (typeof document === "undefined") return;
  try {
    document.cookie = `${name}=;path=/;max-age=0;SameSite=Lax`;
  } catch {
    /* ignore */
  }
}

function removeStorageKeys(
  storage: Storage,
  shouldRemove: (key: string) => boolean,
): void {
  const keys: string[] = [];
  try {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i);
      if (key && shouldRemove(key)) keys.push(key);
    }
    for (const key of keys) {
      try {
        storage.removeItem(key);
      } catch {
        /* ignore */
      }
    }
  } catch {
    /* ignore */
  }
}

function matchesPrefix(key: string, prefixes: readonly string[]): boolean {
  return prefixes.some((prefix) => key.startsWith(prefix));
}

function extractScopedUserId(key: string, prefix: string): string | null {
  if (!key.startsWith(prefix)) return null;
  const rest = key.slice(prefix.length);
  const colonIdx = rest.indexOf(":");
  if (colonIdx <= 0) return null;
  return rest.slice(0, colonIdx);
}

function extractRecordDraftUserId(key: string): string | null {
  if (key.startsWith("doctor8:record-draft:")) {
    return extractScopedUserId(key, "doctor8:record-draft:");
  }
  if (key.startsWith("doctor8:recordDraft:")) {
    return null;
  }
  return null;
}

/** userId sits after the hum subtype segment: doctor8:hum:{subtype}:{userId}:? */
function extractHumDraftUserId(key: string): string | null {
  if (!key.startsWith(HUM_STORAGE_PREFIX)) return null;

  const rest = key.slice(HUM_STORAGE_PREFIX.length);
  const subtypeEnd = rest.indexOf(":");
  if (subtypeEnd <= 0) return null;

  const subtype = rest.slice(0, subtypeEnd);
  if (subtype !== "draft" && subtype !== "queue" && subtype !== "volunteer" && subtype !== "angel") {
    return null;
  }

  const afterSubtype = rest.slice(subtypeEnd + 1);
  const userIdEnd = afterSubtype.indexOf(":");
  if (userIdEnd <= 0) return null;

  const candidate = afterSubtype.slice(0, userIdEnd);
  if (!candidate) return null;

  // Legacy draft keys used kind (triage/anamnese) where userId now lives.
  if (subtype === "draft" && HUM_DRAFT_KINDS.has(candidate)) return null;

  return candidate;
}

function draftKeyUserId(key: string): string | null {
  const recordUserId = extractRecordDraftUserId(key);
  if (recordUserId !== null || key.startsWith("doctor8:record-draft:") || key.startsWith("doctor8:recordDraft:")) {
    return recordUserId;
  }

  if (key.startsWith(HUM_STORAGE_PREFIX)) {
    return extractHumDraftUserId(key);
  }

  return null;
}

/** Clears sensitive client state on logout / pre-login signOut. */
export function clearSensitiveClientState(userId?: string): void {
  if (typeof window === "undefined") return;

  removeStorageKeys(localStorage, (key) => matchesPrefix(key, LOCAL_STORAGE_PREFIXES));

  removeStorageKeys(sessionStorage, (key) => {
    if ((SESSION_STORAGE_EXACT_KEYS as readonly string[]).includes(key)) return true;
    return matchesPrefix(key, SESSION_STORAGE_PREFIXES);
  });

  for (const name of SCOPE_COOKIES) {
    expireCookie(name);
  }

  if (userId) {
    import("@/lib/humanitarian/outbox")
      .then((m) => m.clearHumanitarianOutboxForUser(userId))
      .catch(() => {});
  }
}

/** Removes draft/cache keys belonging to other users (or legacy unscoped keys). */
export function clearForeignUserState(currentUserId: string): void {
  if (typeof window === "undefined") return;
  const current = currentUserId.trim();
  if (!current) return;

  const shouldRemoveDraftKey = (key: string) => {
    if (!matchesPrefix(key, DRAFT_STORAGE_PREFIXES)) return false;
    const ownerId = draftKeyUserId(key);
    return ownerId === null || ownerId !== current;
  };

  removeStorageKeys(localStorage, shouldRemoveDraftKey);
  removeStorageKeys(sessionStorage, shouldRemoveDraftKey);
}
