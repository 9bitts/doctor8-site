import { db } from "@/lib/db";
import {
  REQUIRED_PRIVACY_VERSION,
  REQUIRED_TERMS_VERSION,
} from "@/lib/legal/versions";

export type PendingLegalAcceptance = {
  needsTerms: boolean;
  needsPrivacy: boolean;
  needsAny: boolean;
};

export async function getPendingLegalAcceptance(userId: string): Promise<PendingLegalAcceptance> {
  const consents = await db.consent.findMany({
    where: {
      userId,
      granted: true,
      type: { in: ["TERMS_OF_SERVICE", "PRIVACY_POLICY"] },
    },
    select: { type: true, version: true },
    orderBy: { grantedAt: "desc" },
  });

  const termsVersion = consents.find((c) => c.type === "TERMS_OF_SERVICE")?.version;
  const privacyVersion = consents.find((c) => c.type === "PRIVACY_POLICY")?.version;

  const needsTerms = !termsVersion || termsVersion < REQUIRED_TERMS_VERSION;
  const needsPrivacy = !privacyVersion || privacyVersion < REQUIRED_PRIVACY_VERSION;

  return {
    needsTerms,
    needsPrivacy,
    needsAny: needsTerms || needsPrivacy,
  };
}
