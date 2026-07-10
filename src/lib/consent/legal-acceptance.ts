import { db } from "@/lib/db";

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

  // Beta / continuity: require acceptance once, not re-acceptance on every policy
  // minor bump. Users who already accepted any version keep dashboard access;
  // new registrations still store REQUIRED_* versions at signup.
  const needsTerms = !termsVersion;
  const needsPrivacy = !privacyVersion;

  return {
    needsTerms,
    needsPrivacy,
    needsAny: needsTerms || needsPrivacy,
  };
}
