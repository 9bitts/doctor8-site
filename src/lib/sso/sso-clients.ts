type SsoClient = {
  clientId: string;
  clientSecret: string;
  redirectUris: string[];
};

function parseRedirectUris(raw: string | undefined): string[] {
  return (raw ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function loadClients(): SsoClient[] {
  const id = process.env.SSO_EIGHT_CLIENT_ID?.trim() || "eight";
  const secret = process.env.SSO_EIGHT_CLIENT_SECRET?.trim();
  const redirectUris = parseRedirectUris(process.env.SSO_EIGHT_REDIRECT_URIS);

  if (!secret) return [];

  return [
    {
      clientId: id,
      clientSecret: secret,
      redirectUris,
    },
  ];
}

export function getSsoClient(clientId: string): SsoClient | null {
  return loadClients().find((c) => c.clientId === clientId) ?? null;
}

export function isSsoRedirectUriAllowed(clientId: string, redirectUri: string): boolean {
  const client = getSsoClient(clientId);
  if (!client) return false;
  if (client.redirectUris.length === 0) {
    try {
      const u = new URL(redirectUri);
      return u.hostname === "localhost" || u.hostname === "127.0.0.1";
    } catch {
      return false;
    }
  }
  return client.redirectUris.includes(redirectUri);
}

export function verifySsoClientSecret(clientId: string, secret: string | null | undefined): boolean {
  if (!secret) return false;
  const client = getSsoClient(clientId);
  if (!client) return false;
  return client.clientSecret.trim() === secret.trim();
}
