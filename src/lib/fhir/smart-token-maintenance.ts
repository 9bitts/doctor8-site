import { db } from "@/lib/db";

/** Remove expired SMART codes/tokens and revoked refresh tokens. */
export async function purgeExpiredSmartTokens(): Promise<{
  codes: number;
  access: number;
  refresh: number;
}> {
  const now = new Date();
  const [codes, access, refresh] = await Promise.all([
    db.smartAuthorizationCode.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.smartAccessToken.deleteMany({ where: { expiresAt: { lt: now } } }),
    db.smartRefreshToken.deleteMany({
      where: {
        OR: [{ expiresAt: { lt: now } }, { revokedAt: { not: null } }],
      },
    }),
  ]);
  return { codes: codes.count, access: access.count, refresh: refresh.count };
}

export async function revokeSmartClientAccess(userId: string, clientId: string): Promise<void> {
  await db.$transaction([
    db.smartAccessToken.deleteMany({ where: { userId, clientId } }),
    db.smartRefreshToken.updateMany({
      where: { userId, clientId, revokedAt: null },
      data: { revokedAt: new Date() },
    }),
  ]);
}
