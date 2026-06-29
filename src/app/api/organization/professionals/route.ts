import { NextResponse } from "next/server";
import { requireOrganizationApi, isApiError } from "@/lib/api-auth";
import { listOrganizationProviders } from "@/lib/organization-providers";
import { db } from "@/lib/db";

export async function GET() {
  const ctx = await requireOrganizationApi();
  if (isApiError(ctx)) return ctx.error;

  const providers = await listOrganizationProviders(ctx.organizationId);

  return NextResponse.json({
    providers: providers.map((p) => ({
      scopeKey: p.scopeKey,
      providerType: p.providerType,
      providerProfileId: p.providerProfileId,
      professionalId: p.providerProfileId,
      name: p.name,
      specialty: p.specialty,
      status: p.status,
      repassePercent: p.repassePercent,
      joinedAt: p.joinedAt,
    })),
    professionals: providers
      .filter((p) => p.providerType === "HEALTH")
      .map((p) => ({
        id: p.scopeKey,
        professionalId: p.providerProfileId,
        name: p.name,
        specialty: p.specialty,
        status: p.status,
        repassePercent: p.repassePercent,
        joinedAt: p.joinedAt,
      })),
    inviteCode: ctx.organization.inviteCode,
  });
}
