export async function register() {
  const sentryOn = Boolean(
    process.env.SENTRY_DSN?.trim() || process.env.NEXT_PUBLIC_SENTRY_DSN?.trim(),
  );
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateServerEnv } = await import("@/lib/env");
    validateServerEnv();
    if (sentryOn) {
      await import("../sentry.server.config");
    }
  }
  if (process.env.NEXT_RUNTIME === "edge" && sentryOn) {
    await import("../sentry.edge.config");
  }
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: { [key: string]: string | string[] | undefined } },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  if (!process.env.SENTRY_DSN?.trim() && !process.env.NEXT_PUBLIC_SENTRY_DSN?.trim()) return;
  const { captureRequestError } = await import("@sentry/nextjs");
  return captureRequestError(err, request, context);
}
