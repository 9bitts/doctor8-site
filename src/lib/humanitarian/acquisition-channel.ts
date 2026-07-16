import { PatientAcquisitionChannel } from "@prisma/client";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

export type PatientAcquisitionInput = {
  cookieHeader?: string | null;
  callbackUrl?: string | null;
};

/**
 * Regular signups must not inherit humanitarian classification from cookies or
 * landing URLs. Humanitarian channels are stamped only by:
 * - `/atendimentohumanitario` → register-humanitarian (`DOCTOR8_HUMANITARIAN`)
 * - ACURA partner intake link (`ACURA_SOS_FORM`)
 */
export function resolvePatientAcquisitionChannel(
  _input: PatientAcquisitionInput,
): PatientAcquisitionChannel | null {
  return null;
}

/**
 * Promote-only acquisition channel updates.
 * Once a patient is humanitarian (portal or ACURA), they never demote to regular.
 * ACURA may promote over `DOCTOR8_HUMANITARIAN`; the reverse never happens.
 *
 * @returns the channel to write, or `null` if the current value must be kept.
 */
export function resolveAcquisitionChannelUpdate(
  current: PatientAcquisitionChannel | null | undefined,
  next: PatientAcquisitionChannel,
): PatientAcquisitionChannel | null {
  if (current === next) return null;
  if (current === PatientAcquisitionChannel.ACURA_SOS_FORM) return null;
  if (current === PatientAcquisitionChannel.DOCTOR8_HUMANITARIAN) {
    return next === PatientAcquisitionChannel.ACURA_SOS_FORM
      ? PatientAcquisitionChannel.ACURA_SOS_FORM
      : null;
  }
  return next;
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
