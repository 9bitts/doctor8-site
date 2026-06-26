/** After login, patients land on the main dashboard unless they have a deep link. */
export function resolvePatientPostLoginUrl(callbackUrl: string): string {
  if (!callbackUrl) return "/patient";

  try {
    const url = new URL(callbackUrl, "https://doctor8.org");
    const path = url.pathname.replace(/\/+$/, "") || "/";

    // Generic /urgent landing ? main panel (user picks care from dashboard)
    if (path === "/urgent" && !url.searchParams.has("sessionId")) {
      return "/patient";
    }

    // Humanitarian registration flows ? dashboard first, banner leads to queue
    if (path.startsWith("/humanitarian/") && !url.searchParams.has("entryId")) {
      return "/patient";
    }

    return callbackUrl.startsWith("/") ? callbackUrl : path + url.search;
  } catch {
    return callbackUrl.startsWith("/") ? callbackUrl : "/patient";
  }
}
