/** SNCR API configuration (RDC 1.000/2025 — Manual API SNCR 1ª ed.). */

export function sncrApiBaseUrl(): string {
  return (
    process.env.SNCR_API_BASE_URL ||
    "https://sncr-api.hmg.apps.anvisa.gov.br/api/v1"
  ).replace(/\/+$/, "");
}

export function sncrEnabled(): boolean {
  return process.env.SNCR_ENABLED !== "false";
}

/** CNPJ da plataforma Doctor8 — obrigatório para RCE/RET (Manual API §2.3.2). */
export function sncrPlatformCnpj(): string | null {
  const raw = process.env.SNCR_PLATFORM_CNPJ || process.env.DOCTOR8_CNPJ || "";
  const digits = raw.replace(/\D/g, "");
  return digits.length === 14 ? digits : null;
}

export function sncrMinBatchSize(): number {
  return 10;
}

export function sncrMaxBatchSize(): number {
  return 50;
}
