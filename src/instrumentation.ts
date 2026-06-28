export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { validateServerEnv } = await import("@/lib/env");
    validateServerEnv();
    if (process.env.SENTRY_DSN) {
      await import("../sentry.server.config");
    }
  }
  if (process.env.NEXT_RUNTIME === "edge" && process.env.SENTRY_DSN) {
    await import("../sentry.edge.config");
  }
}

export async function onRequestError(
  err: unknown,
  request: { path: string; method: string; headers: { [key: string]: string | string[] | undefined } },
  context: { routerKind: string; routePath: string; routeType: string },
) {
  if (!process.env.SENTRY_DSN) return;
  const { captureRequestError } = await import("@sentry/nextjs");
  return captureRequestError(err, request, context);
}
