import { db } from "@/lib/db";

let cachedClients: { clientId: string; redirectUris: string[] }[] | null = null;
let cacheAt = 0;
const CACHE_MS = 60_000;

async function loadClients(): Promise<{ clientId: string; redirectUris: string[] }[]> {
  const now = Date.now();
  if (cachedClients && now - cacheAt < CACHE_MS) return cachedClients;
  const rows = await db.smartOAuthClient.findMany({
    where: { active: true },
    select: { clientId: true, redirectUris: true },
  });
  cachedClients = rows.map((r) => ({
    clientId: r.clientId,
    redirectUris: r.redirectUris.split(",").map((s) => s.trim()).filter(Boolean),
  }));
  cacheAt = now;
  return cachedClients;
}

export function invalidateSmartClientCache(): void {
  cachedClients = null;
  cacheAt = 0;
}

export async function isRegisteredSmartClient(clientId: string): Promise<boolean> {
  const clients = await loadClients();
  return clients.some((c) => c.clientId === clientId);
}

export async function isRedirectUriAllowedForClient(
  clientId: string,
  uri: string,
): Promise<boolean> {
  const clients = await loadClients();
  const row = clients.find((c) => c.clientId === clientId);
  if (!row) return false;
  return row.redirectUris.includes(uri);
}

export async function getSmartClientName(clientId: string): Promise<string | null> {
  const row = await db.smartOAuthClient.findUnique({
    where: { clientId },
    select: { name: true, active: true },
  });
  if (!row?.active) return null;
  return row.name;
}

export async function listSmartOAuthClients() {
  return db.smartOAuthClient.findMany({ orderBy: { createdAt: "desc" } });
}
