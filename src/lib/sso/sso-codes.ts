import crypto from "crypto";
import { db } from "@/lib/db";

const CODE_TTL_MS = 10 * 60 * 1000;
const IDENTIFIER_PREFIX = "sso-code:";

type StoredCodeMeta = {
  clientId: string;
  userId: string;
  redirectUri: string;
  scope: string;
  nonce?: string | null;
  codeChallenge?: string | null;
  codeChallengeMethod?: string | null;
  organizationId?: string | null;
};

function encodeMeta(meta: StoredCodeMeta): string {
  return `${IDENTIFIER_PREFIX}${Buffer.from(JSON.stringify(meta)).toString("base64url")}`;
}

function decodeMeta(identifier: string): StoredCodeMeta | null {
  if (!identifier.startsWith(IDENTIFIER_PREFIX)) return null;
  try {
    return JSON.parse(
      Buffer.from(identifier.slice(IDENTIFIER_PREFIX.length), "base64url").toString("utf8")
    ) as StoredCodeMeta;
  } catch {
    return null;
  }
}

export async function createSsoAuthorizationCode(meta: StoredCodeMeta): Promise<string> {
  const code = crypto.randomBytes(32).toString("base64url");
  const expires = new Date(Date.now() + CODE_TTL_MS);

  await db.verificationToken.create({
    data: {
      identifier: encodeMeta(meta),
      token: code,
      expires,
    },
  });

  return code;
}

export async function consumeSsoAuthorizationCode(
  code: string,
  clientId: string,
  redirectUri: string
): Promise<StoredCodeMeta | null> {
  const row = await db.verificationToken.findFirst({
    where: { token: code },
  });
  if (!row || row.expires < new Date()) {
    if (row) {
      await db.verificationToken
        .delete({
          where: {
            identifier_token: { identifier: row.identifier, token: row.token },
          },
        })
        .catch(() => {});
    }
    return null;
  }

  const meta = decodeMeta(row.identifier);
  if (!meta) return null;
  if (meta.clientId !== clientId || meta.redirectUri !== redirectUri) return null;

  await db.verificationToken.delete({
    where: { identifier_token: { identifier: row.identifier, token: row.token } },
  });

  return meta;
}
