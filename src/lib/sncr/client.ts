import { db } from "@/lib/db";
import { encrypt, decrypt } from "@/lib/encryption";
import { sncrApiBaseUrl } from "@/lib/sncr/config";

export type SncrCouncil = "CRM" | "CRMV" | "CRO";

export type NotificacaoReceitaType = "NRA" | "NRB" | "NRB2" | "NRR" | "NRT";
export type ReceitaEspecialType = "RCE" | "RET";

export class SncrApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body?: unknown,
  ) {
    super(message);
    this.name = "SncrApiError";
  }
}

async function sncrFetch(
  path: string,
  accessToken: string,
  init?: RequestInit,
): Promise<Response> {
  const url = `${sncrApiBaseUrl()}${path.startsWith("/") ? path : `/${path}`}`;
  return fetch(url, {
    ...init,
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
      ...(init?.headers || {}),
    },
  });
}

export function buildSncrLoginUrl(clientReturnUrl: string): string {
  const base = sncrApiBaseUrl();
  const params = new URLSearchParams({ client_url: clientReturnUrl });
  return `${base}/auth/login?${params.toString()}`;
}

export async function exchangeSncrSessionToken(
  sessionId: string,
): Promise<{ accessToken: string; raw: unknown }> {
  const url = `${sncrApiBaseUrl()}/auth/token?session_id=${encodeURIComponent(sessionId)}`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new SncrApiError(
      typeof data?.message === "string" ? data.message : "Falha ao obter token SNCR",
      res.status,
      data,
    );
  }
  const accessToken =
    (data as { access_token?: string }).access_token ||
    (data as { accessToken?: string }).accessToken;
  if (!accessToken) {
    throw new SncrApiError("Resposta SNCR sem access_token", res.status, data);
  }
  return { accessToken, raw: data };
}

export async function requestNotificacaoReceitaNumbers(opts: {
  accessToken: string;
  receita: NotificacaoReceitaType;
  conselho: SncrCouncil;
  uf: string;
  documento: string;
  quantidade: number;
}): Promise<{ numbers: string[]; saldoReceitas?: number; message?: string }> {
  const res = await sncrFetch("/numeracoes/notificacao-receita", opts.accessToken, {
    method: "POST",
    body: JSON.stringify({
      receita: opts.receita,
      conselho: opts.conselho,
      uf: opts.uf.toUpperCase(),
      documento: opts.documento.replace(/\D/g, "") || opts.documento,
      quantidade: opts.quantidade,
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (res.status === 204) {
    return { numbers: [], message: "Nenhuma numeração disponível" };
  }
  if (!res.ok) {
    const msg =
      typeof (data as { message?: string }).message === "string"
        ? (data as { message: string }).message
        : "Erro ao requisitar numeração SNCR";
    throw new SncrApiError(msg, res.status, data);
  }
  const rawNumbers = (data as { numeroReceita?: string | string[] }).numeroReceita;
  const numbers = Array.isArray(rawNumbers)
    ? rawNumbers
    : rawNumbers
      ? [rawNumbers]
      : [];
  return {
    numbers,
    saldoReceitas: (data as { saldoReceitas?: number }).saldoReceitas,
    message: (data as { mensagem?: string }).mensagem,
  };
}

export async function requestReceitaEspecialNumbers(opts: {
  accessToken: string;
  tipo: ReceitaEspecialType;
  conselho: SncrCouncil;
  uf: string;
  documento: string;
  cnpj: string;
}): Promise<{ numbers: string[]; inicio?: string; fim?: string }> {
  const res = await sncrFetch("/numeracoes/receita-especial-retencao", opts.accessToken, {
    method: "POST",
    body: JSON.stringify({
      tipo: opts.tipo,
      conselho: opts.conselho,
      uf: opts.uf.toUpperCase(),
      documento: opts.documento.replace(/\D/g, "") || opts.documento,
      cnpj: opts.cnpj.replace(/\D/g, ""),
    }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg =
      typeof (data as { message?: string }).message === "string"
        ? (data as { message: string }).message
        : "Erro ao requisitar numeração RCE SNCR";
    throw new SncrApiError(msg, res.status, data);
  }
  const inicio = (data as { inicio?: string }).inicio;
  const fim = (data as { fim?: string }).fim;
  if (inicio && fim) {
    return { numbers: [inicio], inicio, fim };
  }
  return { numbers: [] };
}

export async function getSncrAccessToken(professionalId: string): Promise<string | null> {
  const row = await db.sncrOAuthCredential.findUnique({
    where: { professionalId },
  });
  if (!row) return null;
  if (row.expiresAt && row.expiresAt < new Date()) return null;
  try {
    return decrypt(row.accessToken);
  } catch {
    return row.accessToken;
  }
}

export async function saveSncrAccessToken(
  professionalId: string,
  accessToken: string,
  expiresAt?: Date | null,
): Promise<void> {
  await db.sncrOAuthCredential.upsert({
    where: { professionalId },
    create: {
      professionalId,
      accessToken: encrypt(accessToken),
      expiresAt: expiresAt || null,
    },
    update: {
      accessToken: encrypt(accessToken),
      expiresAt: expiresAt || null,
    },
  });
}

export function councilFromSpecialty(specialty: string): SncrCouncil {
  const s = specialty.toLowerCase();
  if (s.includes("odont") || s.includes("dent")) return "CRO";
  if (s.includes("vet")) return "CRMV";
  return "CRM";
}
