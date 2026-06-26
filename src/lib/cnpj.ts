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

export async function lookupCnpj(cnpj: string): Promise<CnpjLookupResult | null> {
  const digits = stripCnpj(cnpj);
  if (!isValidCnpj(digits)) return null;

  try {
    const res = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${digits}`, {
      next: { revalidate: 86400 },
    });
    if (!res.ok) return null;
    const data = await res.json();

    return {
      cnpj: digits,
      razaoSocial: data.razao_social || data.nome_fantasia || "",
      nomeFantasia: data.nome_fantasia || data.razao_social || "",
      addressStreet: data.logradouro || undefined,
      addressNumber: data.numero || undefined,
      addressComplement: data.complemento || undefined,
      addressNeighborhood: data.bairro || undefined,
      addressCity: data.municipio || undefined,
      addressState: data.uf || undefined,
      addressZip: data.cep?.replace(/\D/g, "") || undefined,
    };
  } catch {
    return null;
  }
}
