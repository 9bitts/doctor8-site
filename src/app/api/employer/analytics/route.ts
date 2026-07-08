import { NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { buildEmployerAnalytics } from "@/lib/employer-analytics";

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const analytics = await buildEmployerAnalytics(ctx.employerCompanyId);
  return NextResponse.json({ analytics });
}
