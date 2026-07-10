import { NextRequest } from "next/server";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { proxyInternalGet } from "@/lib/proxy-internal-get";

/** Patient-scoped alias — proxies to the shared PDF handler with the same session. */
export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } },
) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  return proxyInternalGet(req, `/api/professional/documents/${params.id}/pdf`);
}
