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

function draftKeyUserId(key: string): string | null {
  for (const prefix of DRAFT_STORAGE_PREFIXES) {
    const userId = extractScopedUserId(key, prefix);
    if (userId !== null) return userId;
    if (key.startsWith(prefix)) return null;
  }
  return null;
}

/** Clears sensitive client state on logout / pre-login signOut. */
export function clearSensitiveClientState(): void {
  if (typeof window === "undefined") return;

  removeStorageKeys(localStorage, (key) => matchesPrefix(key, LOCAL_STORAGE_PREFIXES));

  removeStorageKeys(sessionStorage, (key) => {
    if ((SESSION_STORAGE_EXACT_KEYS as readonly string[]).includes(key)) return true;
    return matchesPrefix(key, SESSION_STORAGE_PREFIXES);
  });

  for (const name of SCOPE_COOKIES) {
    expireCookie(name);
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
