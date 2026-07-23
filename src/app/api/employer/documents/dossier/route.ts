import { NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { buildComplianceDossier } from "@/lib/employer-compliance-dossier";

export async function POST() {
  const ctx = await requireEmployerApi(["OWNER", "ADMIN", "SST"]);
  if ("error" in ctx) return ctx.error;

  const dossier = await buildComplianceDossier(ctx.employerCompanyId);
  if (!dossier) {
    return NextResponse.json({ error: "Company not found" }, { status: 404 });
  }

  return NextResponse.json({ export: dossier });
}
