import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { NextResponse } from "next/server";
import type { PharmacyStoreMemberRole } from "@prisma/client";

const ADMIN_ROLES: PharmacyStoreMemberRole[] = ["OWNER", "ADMIN"];

export type PharmacyStoreContext = {
  userId: string;
  pharmacyStoreId: string;
  memberRole: PharmacyStoreMemberRole;
  store: {
    id: string;
    nomeFantasia: string;
    cnpj: string;
    slug: string;
    status: string;
  };
};

export async function getPharmacyStoreMembership(userId: string) {
  return db.pharmacyStoreMember.findFirst({
    where: { userId, status: "ACTIVE" },
    include: {
      pharmacyStore: {
        select: {
          id: true,
          nomeFantasia: true,
          razaoSocial: true,
          cnpj: true,
          slug: true,
          status: true,
          contactEmail: true,
          contactPhone: true,
          addressStreet: true,
          addressNumber: true,
          addressComplement: true,
          addressNeighborhood: true,
          addressCity: true,
          addressState: true,
          addressZip: true,
          acceptsPickup: true,
          acceptsDelivery: true,
          deliveryRadiusKm: true,
          platformFeeCents: true,
          responsibleFirstName: true,
          responsibleLastName: true,
        },
      },
    },
  });
}

export async function requirePharmacyStore(
  allowedRoles?: PharmacyStoreMemberRole[],
): Promise<PharmacyStoreContext | { error: NextResponse }> {
  const session = await auth();
  if (!session?.user) {
    return { error: NextResponse.json({ error: "Unauthorized" }, { status: 401 }) };
  }
  if (session.user.role !== "PHARMACY_STORE" && session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  const membership = await getPharmacyStoreMembership(session.user.id);
  if (!membership) {
    return { error: NextResponse.json({ error: "Pharmacy store not found" }, { status: 404 }) };
  }

  if (allowedRoles && !allowedRoles.includes(membership.role) && session.user.role !== "ADMIN") {
    return { error: NextResponse.json({ error: "Forbidden" }, { status: 403 }) };
  }

  return {
    userId: session.user.id,
    pharmacyStoreId: membership.pharmacyStoreId,
    memberRole: membership.role,
    store: {
      id: membership.pharmacyStore.id,
      nomeFantasia: membership.pharmacyStore.nomeFantasia,
      cnpj: membership.pharmacyStore.cnpj,
      slug: membership.pharmacyStore.slug,
      status: membership.pharmacyStore.status,
    },
  };
}

export function canManagePharmacyInventory(role: PharmacyStoreMemberRole): boolean {
  return ADMIN_ROLES.includes(role) || role === "STAFF";
}

export function canManagePharmacyStoreSettings(role: PharmacyStoreMemberRole): boolean {
  return ADMIN_ROLES.includes(role);
}
