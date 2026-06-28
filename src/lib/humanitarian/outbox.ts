const DB_NAME = "doctor8-hum";
const STORE = "outbox";
const LEGACY_KEY = "doctor8:hum:outbox";

export type OutboxItem = {
  id: string;
  url: string;
  method: "POST" | "PATCH";
  body: Record<string, unknown>;
  createdAt: number;
};

function idbSupported(): boolean {
  return typeof window !== "undefined" && "indexedDB" in window;
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: "id" });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function readAllIdb(): Promise<OutboxItem[]> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readonly");
    const store = tx.objectStore(STORE);
    const req = store.getAll();
    req.onsuccess = () => resolve((req.result as OutboxItem[]) || []);
    req.onerror = () => reject(req.error);
  });
}

async function writeAllIdb(items: OutboxItem[]): Promise<void> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, "readwrite");
    const store = tx.objectStore(STORE);
    store.clear();
    for (const item of items) store.put(item);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

function readLegacy(): OutboxItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(LEGACY_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OutboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function migrateLegacy(): Promise<void> {
  const legacy = readLegacy();
  if (!legacy.length) return;
  const current = await readAllIdb();
  if (current.length === 0) {
    await writeAllIdb(legacy);
  }
  try {
    localStorage.removeItem(LEGACY_KEY);
  } catch {
    /* ignore */
  }
}

async function readOutbox(): Promise<OutboxItem[]> {
  if (typeof window === "undefined") return [];
  if (!idbSupported()) return readLegacy();
  try {
    await migrateLegacy();
    return await readAllIdb();
  } catch {
    return readLegacy();
  }
}

async function writeOutbox(items: OutboxItem[]): Promise<void> {
  if (typeof window === "undefined") return;
  if (!idbSupported()) {
    try {
      localStorage.setItem(LEGACY_KEY, JSON.stringify(items));
    } catch {
      /* quota */
    }
    return;
  }
  try {
    await writeAllIdb(items);
  } catch {
    try {
      localStorage.setItem(LEGACY_KEY, JSON.stringify(items));
    } catch {
      /* ignore */
    }
  }
}

async function requestOutboxBackgroundSync(): Promise<void> {
  if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;
  try {
    const reg = await navigator.serviceWorker.ready;
    if ("sync" in reg) {
      await (reg as ServiceWorkerRegistration & { sync: { register: (tag: string) => Promise<void> } }).sync.register("hum-outbox-sync");
    }
  } catch {
    /* Background Sync not supported */
  }
}

export async function enqueueHumanitarianSubmit(
  item: Omit<OutboxItem, "id" | "createdAt">,
): Promise<string> {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const next: OutboxItem = { ...item, id, createdAt: Date.now() };
  const items = await readOutbox();
  await writeOutbox([...items, next]);
  await requestOutboxBackgroundSync();
  return id;
}

export async function listHumanitarianOutbox(): Promise<OutboxItem[]> {
  return readOutbox();
}

export async function removeHumanitarianOutboxItem(id: string): Promise<void> {
  const items = await readOutbox();
  await writeOutbox(items.filter((i) => i.id !== id));
}

export async function flushHumanitarianOutbox(): Promise<number> {
  if (typeof window === "undefined" || !navigator.onLine) return 0;
  const items = await readOutbox();
  if (items.length === 0) return 0;

  let flushed = 0;
  for (const item of items) {
    try {
      const res = await fetch(item.url, {
        method: item.method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(item.body),
      });
      if (res.ok) {
        await removeHumanitarianOutboxItem(item.id);
        flushed += 1;
      }
    } catch {
      break;
    }
  }
  return flushed;
}
