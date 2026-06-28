import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";

/** Navigate back when history exists; otherwise go to a safe in-app fallback. */
export function navigateBack(router: AppRouterInstance, fallbackHref: string) {
  if (typeof window !== "undefined" && window.history.length > 1) {
    const ref = document.referrer;
    const sameOrigin =
      !ref || ref.startsWith(window.location.origin);
    if (sameOrigin) {
      router.back();
      return;
    }
  }
  router.push(fallbackHref);
}

/** Contextual fallback for humanitarian sub-routes when browser history is empty. */
export function humanitarianBackFallback(pathname: string): string {
  const m = pathname.match(/^\/humanitarian\/([^/]+)(?:\/(.+))?$/);
  if (!m) {
    if (pathname.startsWith("/humanitarian/volunteer")) return "/patient";
    if (pathname.startsWith("/humanitarian/angel")) return "/patient";
    return "/patient";
  }
  const slug = m[1];
  const sub = m[2] || "";
  if (sub === "triage") return `/humanitarian/${slug}`;
  if (sub === "tcle") return `/humanitarian/${slug}/triage`;
  if (sub === "anamnese") return `/humanitarian/${slug}`;
  return "/patient";
}