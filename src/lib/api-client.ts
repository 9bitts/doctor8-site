// Parse JSON API responses safely (handles HTML error pages from the server).

export async function readApiJson<T = Record<string, unknown>>(
  res: Response,
): Promise<{ ok: boolean; status: number; data: T | null; raw: string }> {
  const raw = await res.text();
  if (!raw.trim()) {
    return { ok: res.ok, status: res.status, data: null, raw };
  }
  try {
    return { ok: res.ok, status: res.status, data: JSON.parse(raw) as T, raw };
  } catch {
    return { ok: res.ok, status: res.status, data: null, raw };
  }
}

export function apiErrorMessage(
  parsed: { ok: boolean; status: number; data: Record<string, unknown> | null; raw: string },
  fallback = "Nao foi possivel completar a operacao.",
): string {
  const err = parsed.data?.error;
  if (typeof err === "string" && err.trim()) return err;
  if (!parsed.ok && parsed.status >= 500) {
    return "Servidor indisponivel no momento. Tente novamente em instantes.";
  }
  if (!parsed.data) {
    return `Resposta invalida do servidor (HTTP ${parsed.status}).`;
  }
  return fallback;
}
