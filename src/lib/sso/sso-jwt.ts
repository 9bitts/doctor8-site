import crypto from "crypto";

const KID = "doctor8-sso-1";
const ACCESS_TOKEN_TTL_SEC = 3600;
const ID_TOKEN_TTL_SEC = 3600;

type KeyPair = {
  privateKey: crypto.KeyObject;
  publicJwk: Record<string, unknown>;
};

let cachedKeys: KeyPair | null = null;

function normalizePem(raw: string): string {
  const trimmed = raw.trim();
  if (trimmed.includes("\\n")) {
    return trimmed.replace(/\\n/g, "\n");
  }
  return trimmed;
}

function loadKeyPair(): KeyPair {
  if (cachedKeys) return cachedKeys;

  const rawPem = process.env.SSO_OAUTH_PRIVATE_KEY?.trim();
  if (rawPem) {
    try {
      const pem = normalizePem(rawPem);
      const privateKey = crypto.createPrivateKey(pem);
      const publicKey = crypto.createPublicKey(privateKey);
      const jwk = publicKey.export({ format: "jwk" }) as JsonWebKey;
      cachedKeys = {
        privateKey,
        publicJwk: {
          ...jwk,
          kid: KID,
          use: "sig",
          alg: "RS256",
        },
      };
      console.info(`[sso] SSO_OAUTH_PRIVATE_KEY carregada com sucesso (kid=${KID})`);
      return cachedKeys;
    } catch (err) {
      console.error("[sso] SSO_OAUTH_PRIVATE_KEY inválida:", err);
      if (process.env.NODE_ENV === "production") {
        throw new Error("SSO_OAUTH_PRIVATE_KEY inválida em produção");
      }
    }
  }

  if (process.env.NODE_ENV === "production") {
    throw new Error("SSO_OAUTH_PRIVATE_KEY é obrigatória em produção");
  }

  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
  });
  const jwk = publicKey.export({ format: "jwk" }) as JsonWebKey;
  cachedKeys = {
    privateKey,
    publicJwk: {
      ...jwk,
      kid: KID,
      use: "sig",
      alg: "RS256",
    },
  };

  console.warn(
    "[sso] SSO_OAUTH_PRIVATE_KEY não configurada — chave efêmera (dev only). " +
      "Em produção multi-instância, tokens emitidos por uma instância não validam em outra."
  );

  return cachedKeys;
}

export function getSsoJwks() {
  return { keys: [loadKeyPair().publicJwk] };
}

function base64url(input: string | Buffer): string {
  return Buffer.from(input).toString("base64url");
}

function signJwt(payload: Record<string, unknown>, expiresInSec: number): string {
  const { privateKey } = loadKeyPair();
  const now = Math.floor(Date.now() / 1000);
  const body = {
    ...payload,
    iat: now,
    exp: now + expiresInSec,
  };
  const header = { alg: "RS256", typ: "JWT", kid: KID };
  const encodedHeader = base64url(JSON.stringify(header));
  const encodedPayload = base64url(JSON.stringify(body));
  const data = `${encodedHeader}.${encodedPayload}`;
  const signature = crypto.sign("RSA-SHA256", Buffer.from(data), privateKey);
  return `${data}.${base64url(signature)}`;
}

export function issueIdToken(params: {
  sub: string;
  aud: string;
  email: string;
  emailVerified: boolean;
  name: string;
  picture?: string | null;
  role: string;
  verified: boolean;
  nonce?: string | null;
  org_type?: string | null;
  org_cnpj?: string | null;
  org_name?: string | null;
  org_razao_social?: string | null;
  org_member_role?: string | null;
}): string {
  const claims: Record<string, unknown> = {
    iss: (process.env.NEXT_PUBLIC_APP_URL || "https://app.doctor8.org").replace(/\/$/, ""),
    sub: params.sub,
    aud: params.aud,
    email: params.email,
    email_verified: params.emailVerified,
    name: params.name,
    role: params.role,
    verified: params.verified,
  };
  if (params.picture) claims.picture = params.picture;
  if (params.nonce) claims.nonce = params.nonce;
  if (params.org_type != null) claims.org_type = params.org_type;
  if (params.org_cnpj != null) claims.org_cnpj = params.org_cnpj;
  if (params.org_name != null) claims.org_name = params.org_name;
  if (params.org_razao_social != null) claims.org_razao_social = params.org_razao_social;
  if (params.org_member_role != null) claims.org_member_role = params.org_member_role;
  return signJwt(claims, ID_TOKEN_TTL_SEC);
}

export function issueAccessToken(params: {
  sub: string;
  aud: string;
  scope: string;
  organizationId?: string | null;
}): string {
  const claims: Record<string, unknown> = {
    sub: params.sub,
    aud: params.aud,
    scope: params.scope,
    token_use: "access",
  };
  if (params.organizationId) {
    claims.organization_id = params.organizationId;
  }
  return signJwt(claims, ACCESS_TOKEN_TTL_SEC);
}

export function verifyAccessToken(
  token: string,
): { sub: string; aud: string; scope: string; organizationId?: string } | null {
  try {
    // A chave pública é derivada da mesma privateKey em memória (loadKeyPair).
    // Em produção, SSO_OAUTH_PRIVATE_KEY deve ser idêntica em todas as instâncias —
    // senão um token emitido no /token de uma réplica falha no /userinfo de outra.
    const { privateKey } = loadKeyPair();
    const publicKey = crypto.createPublicKey(privateKey);
    const parts = token.split(".");
    if (parts.length !== 3) return null;
    const [headerB64, payloadB64, sigB64] = parts;
    const data = `${headerB64}.${payloadB64}`;
    const sig = Buffer.from(sigB64, "base64url");
    const ok = crypto.verify("RSA-SHA256", Buffer.from(data), publicKey, sig);
    if (!ok) return null;
    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8")) as {
      sub?: string;
      aud?: string;
      scope?: string;
      exp?: number;
      token_use?: string;
      organization_id?: string;
    };
    if (payload.token_use !== "access") return null;
    if (!payload.sub || !payload.aud || !payload.scope) return null;
    if (typeof payload.exp !== "number") return null;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return {
      sub: payload.sub,
      aud: payload.aud,
      scope: payload.scope,
      organizationId: payload.organization_id,
    };
  } catch {
    return null;
  }
}

export { ACCESS_TOKEN_TTL_SEC, ID_TOKEN_TTL_SEC };
