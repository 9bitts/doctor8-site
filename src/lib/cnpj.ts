// CNPJ validation and formatting (Brazil)

export function stripCnpj(cnpj: string): string {
  return cnpj.replace(/\D/g, "");
}

export function formatCnpj(cnpj: string): string {
  const d = stripCnpj(cnpj);
  if (d.length !== 14) return cnpj;
  return `${d.slice(0, 2)}.${d.slice(2, 5)}.${d.slice(5, 8)}/${d.slice(8, 12)}-${d.slice(12)}`;
}

export function isValidCnpj(cnpj: string): boolean {
  const d = stripCnpj(cnpj);
  if (d.length !== 14) return false;
  if (/^(\d)\1+$/.test(d)) return false;

  const calc = (base: string, weights: number[]) => {
    let sum = 0;
    for (let i = 0; i < weights.length; i++) {
      sum += parseInt(base[i], 10) * weights[i];
    }
    const rest = sum % 11;
    return rest < 2 ? 0 : 11 - rest;
  };

  const w1 = [5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];
  const w2 = [6, 5, 4, 3, 2, 9, 8, 7, 6, 5, 4, 3, 2];

  const d1 = calc(d.slice(0, 12), w1);
  const d2 = calc(d.slice(0, 12) + d1, w2);

  return d.endsWith(`${d1}${d2}`);
}

export function slugifyOrganizationName(name: string): string {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60) || "clinica";
}

export type CnpjLookupResult = {
  cnpj: string;
  razaoSocial: string;
  nomeFantasia: string;
  addressStreet?: string;
  addressNumber?: string;
  addressComplement?: string;
  addressNeighborhood?: string;
  addressCity?: string;
  addressState?: string;
  addressZip?: string;
};

const LOOKUP_TIMEOUT_MS = 8000;

async function fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), LOOKUP_TIMEOUT_MS);
  try {
    return await fetch(url, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(timer);
  }
}

function fromBrasilApi(data: Record<string, unknown>, digits: string): CnpjLookupResult {
  return {
    cnpj: digits,
    razaoSocial: String(data.razao_social || data.nome_fantasia || ""),
    nomeFantasia: String(data.nome_fantasia || data.razao_social || ""),
    addressStreet: data.logradouro ? String(data.logradouro) : undefined,
    addressNumber: data.numero ? String(data.numero) : undefined,
    addressComplement: data.complemento ? String(data.complemento) : undefined,
    addressNeighborhood: data.bairro ? String(data.bairro) : undefined,
    addressCity: data.municipio ? String(data.municipio) : undefined,
    addressState: data.uf ? String(data.uf) : undefined,
    addressZip: data.cep ? String(data.cep).replace(/\D/g, "") : undefined,
  };
}

async function lookupBrasilApi(digits: string): Promise<CnpjLookupResult | null> {
  const res = await fetchWithTimeout(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const razao = String(data.razao_social || data.nome_fantasia || "");
  if (!razao) return null;
  return fromBrasilApi(data, digits);
}

async function lookupCnpjWs(digits: string): Promise<CnpjLookupResult | null> {
  const res = await fetchWithTimeout(`https://publica.cnpj.ws/cnpj/${digits}`, {
    headers: { Accept: "application/json" },
  });
  if (!res.ok) return null;
  const data = await res.json();
  const est = data.estabelecimento as Record<string, unknown> | undefined;
  const razao = String(data.razao_social || est?.nome_fantasia || "");
  if (!razao) return null;
  return {
    cnpj: digits,
    razaoSocial: razao,
    nomeFantasia: String(est?.nome_fantasia || data.razao_social || razao),
    addressStreet: est?.logradouro ? String(est.logradouro) : undefined,
    addressNumber: est?.numero ? String(est.numero) : undefined,
    addressComplement: est?.complemento ? String(est.complemento) : undefined,
    addressNeighborhood: est?.bairro ? String(est.bairro) : undefined,
    addressCity: (est?.cidade as { nome?: string } | undefined)?.nome,
    addressState: (est?.estado as { sigla?: string } | undefined)?.sigla,
    addressZip: est?.cep ? String(est.cep).replace(/\D/g, "") : undefined,
  };
}

export async function lookupCnpj(cnpj: string): Promise<CnpjLookupResult | null> {
  const digits = stripCnpj(cnpj);
  if (!isValidCnpj(digits)) return null;

  try {
    const primary = await lookupBrasilApi(digits);
    if (primary) return primary;
  } catch (err) {
    console.warn("[CNPJ] BrasilAPI failed:", err instanceof Error ? err.message : err);
  }

  try {
    const fallback = await lookupCnpjWs(digits);
    if (fallback) return fallback;
  } catch (err) {
    console.warn("[CNPJ] cnpj.ws fallback failed:", err instanceof Error ? err.message : err);
  }

  return null;
}
