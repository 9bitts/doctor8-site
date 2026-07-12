export function ssoAppUrl(): string {
  return (process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org").replace(/\/$/, "");
}

export function getOpenIdConfiguration() {
  const base = ssoAppUrl();
  return {
    issuer: base,
    authorization_endpoint: `${base}/api/oauth/authorize`,
    token_endpoint: `${base}/api/oauth/token`,
    userinfo_endpoint: `${base}/api/oauth/userinfo`,
    jwks_uri: `${base}/.well-known/jwks.json`,
    response_types_supported: ["code"],
    grant_types_supported: ["authorization_code"],
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "email", "profile"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    claims_supported: [
      "sub",
      "email",
      "email_verified",
      "name",
      "picture",
      "role",
      "verified",
      "org_type",
      "org_cnpj",
      "org_name",
      "org_razao_social",
      "org_member_role",
    ],
  };
}

/** Roles allowed to SSO into eight. */
export const EIGHT_SSO_ROLES = new Set([
  "PROFESSIONAL",
  "PSYCHOANALYST",
  "INTEGRATIVE_THERAPIST",
  "ADMIN",
]);

export const VITAL8_SSO_ROLES = new Set([
  "ORGANIZATION",
  "EMPLOYER",
  "PHARMACY_STORE",
  "LABORATORY",
]);

const SSO_CLIENT_ROLES: Record<string, Set<string>> = {
  eight: EIGHT_SSO_ROLES,
  vital8: VITAL8_SSO_ROLES,
};

/** Role gate per registered OIDC client (falls back to EIGHT_SSO_ROLES). */
export function getSsoRolesForClient(clientId: string): Set<string> {
  return SSO_CLIENT_ROLES[clientId] ?? EIGHT_SSO_ROLES;
}

export function getSsoAccessDeniedMessage(clientId: string): string {
  if (clientId === "vital8") {
    return "Apenas contas de clínica, empresa, farmácia ou laboratório podem acessar o vital8.";
  }
  return "Apenas profissionais de saúde podem acessar a eight.";
}
