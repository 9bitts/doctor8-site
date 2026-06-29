import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireOrganizationApi, isApiError } from "@/lib/api-auth";
import { getOrganizationMembership } from "@/lib/organization-auth";

import { auth } from "@/lib/auth";
import { formatCnpj } from "@/lib/cnpj";
import { z } from "zod";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const membership = await getOrganizationMembership(session.user.id);
  if (!membership) {
    return NextResponse.json({ organization: null });
  }

  const org = membership.organization;
  const [memberCount, professionalCount] = await Promise.all([
    db.organizationMember.count({ where: { organizationId: org.id, status: "ACTIVE" } }),
    db.organizationProfessional.count({ where: { organizationId: org.id, status: "ACTIVE" } }),
  ]);

  return NextResponse.json({
    organization: {
      id: org.id,
      cnpj: formatCnpj(org.cnpj),
      cnpjRaw: org.cnpj,
      razaoSocial: org.razaoSocial,
      nomeFantasia: org.nomeFantasia,
      slug: org.slug,
      inviteCode: org.inviteCode,
      contactEmail: org.contactEmail,
      contactPhone: org.contactPhone,
      logoUrl: org.logoUrl,
      currency: org.currency,
      memberRole: membership.role,
      whatsappRemindersEnabled: org.whatsappRemindersEnabled,
      responsibleName: `${org.responsibleFirstName} ${org.responsibleLastName}`,
      address: {
        street: org.addressStreet,
        number: org.addressNumber,
        complement: org.addressComplement,
        neighborhood: org.addressNeighborhood,
        city: org.addressCity,
        state: org.addressState,
        zip: org.addressZip,
      },
      stats: { members: memberCount, professionals: professionalCount },
    },
  });
}

const patchSchema = z.object({
  nomeFantasia: z.string().min(2).max(120).optional(),
  contactPhone: z.string().max(20).optional(),
  addressStreet: z.string().max(200).optional(),
  addressNumber: z.string().max(20).optional(),
  addressComplement: z.string().max(100).optional(),
  addressNeighborhood: z.string().max(100).optional(),
  addressCity: z.string().max(100).optional(),
  addressState: z.string().max(2).optional(),
  addressZip: z.string().max(10).optional(),
  whatsappRemindersEnabled: z.boolean().optional(),
});

export async function PATCH(req: NextRequest) {
  const ctx = await requireOrganizationApi(["OWNER", "ADMIN"]);
  if (isApiError(ctx)) return ctx.error;

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const org = await db.organization.update({
    where: { id: ctx.organizationId },
    data: {
      ...parsed.data,
      addressZip: parsed.data.addressZip?.replace(/\D/g, ""),
    },
  });

  return NextResponse.json({ success: true, id: org.id });
}
