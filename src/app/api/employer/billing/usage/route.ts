import { NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { buildEapUsageReport } from "@/lib/employer-eap-usage";

export async function GET() {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN"]);
  if ("error" in ctx) return ctx.error;

  const report = await buildEapUsageReport(ctx.employerCompanyId);
  return NextResponse.json({ report });
}
