import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

/** After login, patients land on the main dashboard unless they have a deep link. */
export function resolvePatientPostLoginUrl(callbackUrl: string): string {
  if (!callbackUrl) return "/patient";

  try {
    const url = new URL(callbackUrl, "https://doctor8.org");
    const path = url.pathname.replace(/\/+$/, "") || "/";

    if (path === "/urgent" && !url.searchParams.has("sessionId")) {
      return "/patient";
    }

    if (path === "/sos-venezuela") {
      return `/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`;
    }

    return callbackUrl.startsWith("/") ? callbackUrl : path + url.search;
  } catch {
    return callbackUrl.startsWith("/") ? callbackUrl : "/patient";
  }
}
