import type { ConsentType } from "@prisma/client";
import {
  PRIVACY_POLICY_VERSION,
  TERMS_OF_SERVICE_VERSION,
} from "@/lib/legal/versions";
import { requiresGdpr, requiresHipaa, requiresLgpd } from "@/lib/registration-regions";

export type RegisterConsentInput = {
  acceptedTerms: boolean;
  acceptedPrivacy: boolean;
  acceptedHipaa?: boolean;
  acceptedGdpr?: boolean;
  acceptedLgpd?: boolean;
  acceptedProfessionalTerms?: boolean;
  acceptedPartnerTerms?: boolean;
};

type Tx = Parameters<Parameters<typeof import("@/lib/db").db.$transaction>[0]>[0];

export async function createRegisterConsents(
  tx: Tx,
  userId: string,
  ip: string,
  userAgent: string,
  input: RegisterConsentInput,
): Promise<void> {
  const consents: { type: ConsentType; granted: boolean; version: string }[] = [
    { type: "TERMS_OF_SERVICE", granted: input.acceptedTerms, version: TERMS_OF_SERVICE_VERSION },
    { type: "PRIVACY_POLICY", granted: input.acceptedPrivacy, version: PRIVACY_POLICY_VERSION },
  ];

  if (input.acceptedHipaa !== undefined) {
    consents.push({
      type: "HIPAA_AUTHORIZATION",
      granted: input.acceptedHipaa,
      version: "1.0",
    });
  }
  if (input.acceptedGdpr !== undefined) {
    consents.push({ type: "GDPR_CONSENT", granted: input.acceptedGdpr, version: "1.0" });
  }
  if (input.acceptedLgpd !== undefined) {
    consents.push({ type: "LGPD_CONSENT", granted: input.acceptedLgpd, version: "1.0" });
  }
  if (input.acceptedProfessionalTerms) {
    consents.push({
      type: "PROFESSIONAL_TERMS",
      granted: true,
      version: TERMS_OF_SERVICE_VERSION,
    });
  }
  if (input.acceptedPartnerTerms) {
    consents.push({
      type: "PARTNER_TERMS",
      granted: true,
      version: TERMS_OF_SERVICE_VERSION,
    });
  }

  await tx.consent.createMany({
    data: consents.map((c) => ({
      userId,
      type: c.type,
      version: c.version,
      granted: c.granted,
      ipAddress: ip,
      userAgent,
    })),
    skipDuplicates: true,
  });
}

/** OAuth signup: user accepted terms on the registration screen before redirect. */
export async function createOAuthSignupConsents(
  tx: Tx,
  userId: string,
  ip: string,
  userAgent: string,
  region: string,
): Promise<void> {
  await createRegisterConsents(tx, userId, ip, userAgent, {
    acceptedTerms: true,
    acceptedPrivacy: true,
    acceptedHipaa: requiresHipaa(region) ? true : undefined,
    acceptedGdpr: requiresGdpr(region) ? true : undefined,
    acceptedLgpd: requiresLgpd(region) ? true : undefined,
  });
}
