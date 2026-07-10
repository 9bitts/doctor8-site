import { PatientAcquisitionChannel } from "@prisma/client";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import {
  readHumOriginFlagFromCookieHeader,
  readHumReturnPathFromCookieHeader,
  resolveHumanitarianAuthCallback,
} from "@/lib/humanitarian/origin-cookie";

export type PatientAcquisitionInput = {
  cookieHeader?: string | null;
  callbackUrl?: string | null;
};

function pathFromCallback(callback: string): string {
  if (callback.startsWith("http")) {
    try {
      return new URL(callback).pathname;
    } catch {
      return callback.split("?")[0] ?? callback;
    }
  }
  return callback.split("?")[0] ?? callback;
}

/** Resolve acquisition channel from humanitarian auth context at patient signup. */
export function resolvePatientAcquisitionChannel(
  input: PatientAcquisitionInput,
): PatientAcquisitionChannel | null {
  const originCookie = readHumOriginFlagFromCookieHeader(input.cookieHeader ?? undefined);
  const returnPath = readHumReturnPathFromCookieHeader(input.cookieHeader ?? undefined);
  const effectiveCallback = resolveHumanitarianAuthCallback(input.callbackUrl, {
    originCookie,
    returnPath,
  });

  if (!originCookie && !effectiveCallback) return null;

  const path = effectiveCallback ? pathFromCallback(effectiveCallback) : returnPath;

  if (path === "/sos-venezuela") {
    return PatientAcquisitionChannel.DOCTOR8_SOS_LANDING;
  }
  if (path?.startsWith("/humanitarian/")) {
    return PatientAcquisitionChannel.DOCTOR8_HUMANITARIAN;
  }
  if (originCookie) {
    return PatientAcquisitionChannel.DOCTOR8_HUMANITARIAN;
  }

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
  const effectiveCallback = resolveHumanitarianAuthCallback(input.callbackUrl, {
    originCookie: readHumOriginFlagFromCookieHeader(input.cookieHeader ?? undefined),
    returnPath: readHumReturnPathFromCookieHeader(input.cookieHeader ?? undefined),
  });
  return effectiveCallback?.slice(0, 500) ?? null;
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
