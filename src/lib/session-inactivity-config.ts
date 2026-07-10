/** Client-side session inactivity settings (mirror SESSION_MAX_AGE_SECONDS on the server). */
export const SESSION_MAX_AGE_SECONDS = parseInt(
  process.env.NEXT_PUBLIC_SESSION_MAX_AGE_SECONDS || "900",
  10,
);

/** Countdown shown in the warning modal before auto-logout. */
export const INACTIVITY_WARNING_SECONDS = 60;

/** Show warning after this much time without user interaction. */
export const INACTIVITY_THRESHOLD_MS =
  (SESSION_MAX_AGE_SECONDS - INACTIVITY_WARNING_SECONDS) * 1000;

export const INACTIVITY_WARNING_COUNTDOWN_MS =
  INACTIVITY_WARNING_SECONDS * 1000;

/** Clicks, keyboard, and form input — not passive scroll (reading without interaction). */
export const SESSION_INTERACTION_EVENTS = [
  "mousedown",
  "keydown",
  "touchstart",
  "click",
  "input",
] as const;
