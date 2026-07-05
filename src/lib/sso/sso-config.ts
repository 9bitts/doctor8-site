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
    subject_types_supported: ["public"],
    id_token_signing_alg_values_supported: ["RS256"],
    scopes_supported: ["openid", "email", "profile"],
    token_endpoint_auth_methods_supported: ["client_secret_post", "client_secret_basic"],
    claims_supported: ["sub", "email", "email_verified", "name", "picture", "role"],
  };
}

/** Roles allowed to SSO into eight (healthcare professionals). */
export const EIGHT_SSO_ROLES = new Set([
  "PROFESSIONAL",
  "PSYCHOANALYST",
  "INTEGRATIVE_THERAPIST",
  "ADMIN",
]);
