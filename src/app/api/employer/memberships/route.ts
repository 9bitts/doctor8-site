import { NextResponse } from "next/server";
import { requireEmployerApi } from "@/lib/api-auth";
import { getEmployerMemberships } from "@/lib/employer-auth";

export async function GET() {
  const ctx = await requireEmployerApi();
  if ("error" in ctx) return ctx.error;

  const memberships = await getEmployerMemberships(ctx.userId);

  return NextResponse.json({
    memberships: memberships.map((m) => ({
      employerCompanyId: m.employerCompanyId,
      role: m.role,
      nomeFantasia: m.employerCompany.nomeFantasia,
      cnpj: m.employerCompany.cnpj,
    })),
    selectedCompanyId: ctx.employerCompanyId,
  });
}
