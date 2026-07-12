import { db } from "@/lib/db";

const STATUS_GATED_ROLES = new Set(["PHARMACY_STORE", "LABORATORY"]);

export function isB2BEntityStatusGated(role: string): boolean {
  return STATUS_GATED_ROLES.has(role);
}

/** Returns false when pharmacy/lab entity is not ACTIVE. Other B2B roles pass through. */
export async function isB2BEntityOperational(
  role: string,
  organizationId: string,
): Promise<boolean> {
  switch (role) {
    case "PHARMACY_STORE": {
      const store = await db.pharmacyStore.findUnique({
        where: { id: organizationId },
        select: { status: true },
      });
      return store?.status === "ACTIVE";
    }
    case "LABORATORY": {
      const lab = await db.laboratory.findUnique({
        where: { id: organizationId },
        select: { status: true },
      });
      return lab?.status === "ACTIVE";
    }
    default:
      return true;
  }
}

export const B2B_ENTITY_INACTIVE_SSO_MESSAGE =
  "Organização aguardando aprovação ou suspensa — acesso a aplicativos parceiros indisponível.";
