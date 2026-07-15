import { NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { getSncrAccessToken } from "@/lib/sncr/client";
import { sncrPoolBalance } from "@/lib/sncr/number-pool";
import { sncrEnabled, sncrPlatformCnpj } from "@/lib/sncr/config";

export async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const professional = await db.professionalProfile.findUnique({
    where: { userId: ctx.userId },
    select: { id: true, digitalSignCpf: true },
  });
  if (!professional) {
    return NextResponse.json({ configured: false });
  }

  const token = await getSncrAccessToken(professional.id);
  const [nrbBalance, rceBalance] = await Promise.all([
    sncrPoolBalance(professional.id, "NRB"),
    sncrPoolBalance(professional.id, "RCE"),
  ]);

  return NextResponse.json({
    enabled: sncrEnabled(),
    authenticated: !!token,
    platformCnpjConfigured: !!sncrPlatformCnpj(),
    cpfConfigured: !!professional.digitalSignCpf,
    pool: { NRB: nrbBalance, RCE: rceBalance },
    loginPath: "/api/professional/sncr/auth/login",
  });
}
