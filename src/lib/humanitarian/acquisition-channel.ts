import { PatientAcquisitionChannel } from "@prisma/client";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

export type PatientAcquisitionInput = {
  cookieHeader?: string | null;
  callbackUrl?: string | null;
};

/**
 * Humanitarian acquisition is stamped only when an ACURA partner intake is linked
 * to the patient account (see linkPartnerIntakesToPatient). Auth cookies and
 * Doctor8 landing pages must not classify regular signups as humanitarian.
 */
export function resolvePatientAcquisitionChannel(
  _input: PatientAcquisitionInput,
): PatientAcquisitionChannel | null {
  return null;
}

export function patientAcquisitionProfileFields(
  channel: PatientAcquisitionChannel | null,
  referrer?: string | null,
): {
  acquisitionChannel?: PatientAcquisitionChannel;
  acquisitionCampaign?: string;
  acquisitionRecordedAt?: Date;
  acquisitionReferrer?: string;
} {
  if (!channel) return {};
  return {
    acquisitionChannel: channel,
    acquisitionCampaign:
      channel === PatientAcquisitionChannel.REGULAR ? undefined : VENEZUELA_CAMPAIGN_SLUG,
    acquisitionRecordedAt: new Date(),
    acquisitionReferrer: referrer?.trim().slice(0, 500) || undefined,
  };
}

export function acquisitionInputFromRequest(
  req: { headers: { get(name: string): string | null } },
  callbackUrl?: string | null,
): PatientAcquisitionInput {
  return {
    cookieHeader: req.headers.get("cookie"),
    callbackUrl,
  };
}

export function resolveAcquisitionReferrer(
  input: PatientAcquisitionInput,
): string | null {
  return input.callbackUrl?.trim().slice(0, 500) ?? null;
}

/** Display channel: stored value, or infer humanitarian vs regular from activity. */
export function resolveDisplayAcquisitionChannel(opts: {
  stored: PatientAcquisitionChannel | null | undefined;
  hasHumanitarianActivity: boolean;
}): PatientAcquisitionChannel {
  if (opts.stored) return opts.stored;
  if (opts.hasHumanitarianActivity) return PatientAcquisitionChannel.DOCTOR8_HUMANITARIAN;
  return PatientAcquisitionChannel.REGULAR;
}
