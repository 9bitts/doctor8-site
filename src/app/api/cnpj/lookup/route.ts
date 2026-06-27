import { NextRequest, NextResponse } from "next/server";
import { isValidCnpj, lookupCnpj, stripCnpj } from "@/lib/cnpj";
import { checkRateLimit, clientIp, RATE_LIMITS, rateLimitResponse } from "@/lib/rate-limit";

export async function GET(req: NextRequest) {
  const ip = clientIp(req);
  const rate = await checkRateLimit({
    namespace: "cnpj:ip",
    key: ip,
    ...RATE_LIMITS.cnpjIp,
  });
  if (!rate.allowed) return rateLimitResponse(rate.retryAfterSec);

  const cnpj = req.nextUrl.searchParams.get("cnpj");
  if (!cnpj) {
    return NextResponse.json({ error: "CNPJ required" }, { status: 400 });
  }

  const digits = stripCnpj(cnpj);
  if (!isValidCnpj(digits)) {
    return NextResponse.json({ error: "CNPJ inv?lido" }, { status: 400 });
  }

  const result = await lookupCnpj(digits);
  if (!result) {
    return NextResponse.json({ error: "CNPJ n?o encontrado" }, { status: 404 });
  }

  return NextResponse.json(result);
}
