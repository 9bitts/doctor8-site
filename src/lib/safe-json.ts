import { NextRequest } from "next/server";

/**
 * Parses a JSON request body without throwing. On malformed/empty bodies
 * (common on flaky mobile connections) it returns null instead of letting the
 * SyntaxError bubble up into an opaque 500. Callers should return a 400 when
 * the result is null.
 */
export async function readJsonBody<T = unknown>(req: NextRequest): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}
