import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import {
  HUMANITARIAN_PATIENT_HOME,
  isHumanitarianPatientAllowedPatientPath,
  resolvePatientRoleHome,
} from "@/lib/humanitarian/patient-identity";

export type PatientPostLoginOptions = {
  humanitarianPatient?: boolean;
};

/** After login, patients land on the humanitarian or regular dashboard unless they have a deep link. */
export function resolvePatientPostLoginUrl(
  callbackUrl: string,
  options?: PatientPostLoginOptions,
): string {
  const defaultHome = resolvePatientRoleHome({
    humanitarianPatient: options?.humanitarianPatient,
  });
  if (!callbackUrl) return defaultHome;

  try {
    const url = new URL(callbackUrl, "https://doctor8.org");
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/urgent" && !url.searchParams.has("sessionId")) {
      return options?.humanitarianPatient ? HUMANITARIAN_PATIENT_HOME : "/patient";
    }

    if (path === "/sos-venezuela") {
      return options?.humanitarianPatient
        ? HUMANITARIAN_PATIENT_HOME
        : `/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`;
    }

    if (options?.humanitarianPatient && path.startsWith("/patient")) {
      if (!isHumanitarianPatientAllowedPatientPath(path)) {
        return HUMANITARIAN_PATIENT_HOME;
      }
    }

    if (options?.humanitarianPatient && path === `/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`) {
      return HUMANITARIAN_PATIENT_HOME;
    }

    return callbackUrl.startsWith("/") ? callbackUrl : path + url.search;
  } catch {
    if (callbackUrl.startsWith("/")) {
      if (
        options?.humanitarianPatient
        && callbackUrl.startsWith("/patient")
        && !isHumanitarianPatientAllowedPatientPath(callbackUrl.split("?")[0] ?? callbackUrl)
      ) {
        return HUMANITARIAN_PATIENT_HOME;
      }
      return callbackUrl;
    }
    return defaultHome;
  }
}
