"use client";

import type { Session } from "next-auth";

type SessionUpdate = (data?: { activityActive?: boolean }) => Promise<Session | null>;

let lastClientExtendAt = 0;
const CLIENT_EXTEND_DEBOUNCE_MS = 30_000;

/** Sliding HIPAA window — call before writes (save prescription, document, etc.). */
export async function extendSessionForWrite(update: SessionUpdate): Promise<void> {
  try {
    await update({ activityActive: true });
    lastClientExtendAt = Date.now();
  } catch {
    /* best effort */
  }
}

/** Debounced extend while the user is filling long forms. */
export function extendSessionOnActivity(update: SessionUpdate): void {
  const now = Date.now();
  if (now - lastClientExtendAt < CLIENT_EXTEND_DEBOUNCE_MS) return;
  lastClientExtendAt = now;
  void update({ activityActive: true }).catch(() => {});
}

export function loginRedirectUrl(): string {
  const returnUrl = window.location.pathname + window.location.search;
  return `/login?callbackUrl=${encodeURIComponent(returnUrl)}`;
}

export function redirectToLoginAfterAuthFailure(delayMs = 1200): void {
  window.setTimeout(() => {
    window.location.href = loginRedirectUrl();
  }, delayMs);
}

export function isAuthFailureStatus(status: number): boolean {
  return status === 401;
}
