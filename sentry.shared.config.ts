/** Shared Sentry options — disabled unless SENTRY_DSN is set (no impact when unset). */
import type { ErrorEvent, EventHint } from "@sentry/nextjs";

export function getSentryDsn(): string | undefined {
  const dsn =
    process.env.SENTRY_DSN?.trim() ||
    process.env.NEXT_PUBLIC_SENTRY_DSN?.trim() ||
    "";
  return dsn || undefined;
}

export function isSentryEnabled(): boolean {
  return Boolean(getSentryDsn());
}

export function getSentryOptions() {
  return {
    dsn: getSentryDsn(),
    enabled: isSentryEnabled(),
    environment:
      process.env.RAILWAY_ENVIRONMENT_NAME ||
      process.env.RAILWAY_GIT_BRANCH ||
      process.env.NODE_ENV ||
      "development",
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.05 : 0,
    sendDefaultPii: false,
    beforeSend(event: ErrorEvent, _hint: EventHint) {
      if (event.request?.data) delete event.request.data;
      if (event.user?.email) delete event.user.email;
      if (event.user?.ip_address) delete event.user.ip_address;
      return event;
    },
  };
}
