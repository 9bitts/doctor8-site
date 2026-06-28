const OUTBOX_KEY = "doctor8:hum:outbox";

export type OutboxItem = {
  id: string;
  url: string;
  method: "POST" | "PATCH";
  body: Record<string, unknown>;
  createdAt: number;
};

function readOutbox(): OutboxItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(OUTBOX_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as OutboxItem[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function writeOutbox(items: OutboxItem[]): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(OUTBOX_KEY, JSON.stringify(items));
  } catch {
    /* quota */
  }
}

export function enqueueHumanitarianSubmit(item: Omit<OutboxItem, "id" | "createdAt">): string {
  const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
  const next: OutboxItem = { ...item, id, createdAt: Date.now() };
  writeOutbox([...readOutbox(), next]);
  return id;
}

export function listHumanitarianOutbox(): OutboxItem[] {
  return readOutbox();
}

export function removeHumanitarianOutboxItem(id: string): void {
  writeOutbox(readOutbox().filter((i) => i.id !== id));
}

export async function flushHumanitarianOutbox(): Promise<number> {
  if (typeof window === "undefined" || !navigator.onLine) return 0;
  const items = readOutbox();
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
        removeHumanitarianOutboxItem(item.id);
        flushed += 1;
      }
    } catch {
      break;
    }
  }
  return flushed;
}
