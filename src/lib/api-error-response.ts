import { NextResponse } from "next/server";

const GENERIC_ERROR = "Erro ao processar solicitação.";

/** Log server-side detail; return a generic message to the client. */
export function internalErrorResponse(
  logTag: string,
  error: unknown,
  status = 500,
): NextResponse {
  console.error(`[${logTag}]`, error);
  return NextResponse.json({ error: GENERIC_ERROR }, { status });
}
