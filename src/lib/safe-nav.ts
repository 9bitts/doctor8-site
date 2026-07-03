import type { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

const VIDEO_BACK_HREF_KEY = "doctor8_video_back_href";
const VIDEO_VIEWER_ROLE_KEY = "doctor8_video_viewer_role";

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

/** Persist role-aware back target for video error screens (read by videoBackFallback). */
export function setVideoNavContext(ctx: {
  role: "patient" | "professional";
  backHref?: string;
}) {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(VIDEO_VIEWER_ROLE_KEY, ctx.role);
  if (ctx.backHref) {
    sessionStorage.setItem(VIDEO_BACK_HREF_KEY, ctx.backHref);
  }
}

/** Contextual fallback for video room error/wait screens when session data is unavailable. */
export function videoBackFallback(): string {
  if (typeof window === "undefined") return "/patient";

  const storedBack = sessionStorage.getItem(VIDEO_BACK_HREF_KEY);
  if (storedBack) return storedBack;

  const role = sessionStorage.getItem(VIDEO_VIEWER_ROLE_KEY);
  const p = window.location.pathname;

  if (p.includes("/video/humanitarian")) return `/humanitarian/${VENEZUELA_CAMPAIGN_SLUG}`;
  if (p.includes("/video/jit")) {
    return role === "professional" ? "/professional/jit" : "/urgent";
  }
  if (p.includes("/video/")) {
    return role === "professional" ? "/professional/appointments" : "/patient/appointments";
  }
  return "/patient";
}

/** Safe back target for humanitarian patient flow (avoids redirect loops with intake gates). */
export function humanitarianBackFallback(
  pathname: string,
  opts?: { retakeTriage?: boolean },
): string {
  const m = pathname.match(/^\/humanitarian\/([^/]+)(?:\/(.+))?$/);
  if (!m) {
    if (pathname.startsWith("/humanitarian/volunteer")) return "/patient";
    if (pathname.startsWith("/humanitarian/angel")) return "/patient";
    return "/patient";
  }
  const slug = m[1];
  const sub = m[2] || "";
  // Triage/TCLE pages auto-forward when intake is incomplete — never back to campaign root.
  if (sub === "triage") {
    return opts?.retakeTriage ? `/humanitarian/${slug}` : "/patient";
  }
  if (sub === "tcle") return "/patient";
  if (sub === "anamnese") return `/humanitarian/${slug}`;
  return "/patient";
}
