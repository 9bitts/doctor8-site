import { db } from "@/lib/db";
import { isPharmacistSpecialty } from "@/lib/profession-label";
import { getPharmacyStoreMembership } from "@/lib/pharmacy-store-auth";

export type PharmacyPrescriptionValidateAuth =
  | { ok: true; role: string; storeId?: string }
  | { ok: false; status: 403 | 400; error: string };

/** Prefer the store bound to the prescription token over a client-supplied store id. */
export function resolveDispenseStoreId(
  rowPharmacyStoreId: string | null | undefined,
  pharmacyStoreId: string | null | undefined,
): string | null {
  return rowPharmacyStoreId ?? pharmacyStoreId ?? null;
}

/**
 * Same authorization as POST /api/pharmacy-store/prescriptions/validate.
 * PHARMACY_STORE and PROFESSIONAL must be active members of the target store.
 * PROFESSIONAL must also have pharmacist specialty.
 */
export async function authorizePharmacyPrescriptionValidate(
  userId: string,
  role: string,
  opts: { pharmacyStoreId?: string | null; rowPharmacyStoreId?: string | null },
): Promise<PharmacyPrescriptionValidateAuth> {
  if (role !== "PROFESSIONAL" && role !== "PHARMACY_STORE" && role !== "ADMIN") {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const storeId = resolveDispenseStoreId(opts.rowPharmacyStoreId, opts.pharmacyStoreId);
  if (!storeId && role !== "ADMIN") {
    const membership = await getPharmacyStoreMembership(userId);
    if (membership) {
      return authorizePharmacyPrescriptionValidate(userId, role, {
        ...opts,
        pharmacyStoreId: membership.pharmacyStoreId,
      });
    }
  }

  if (!storeId && role !== "ADMIN") {
    return { ok: false, status: 400, error: "pharmacyStoreId obrigatório" };
  }

  if (role === "PHARMACY_STORE" && storeId) {
    const member = await db.pharmacyStoreMember.findFirst({
      where: { userId, pharmacyStoreId: storeId, status: "ACTIVE" },
    });
    if (!member) {
      return { ok: false, status: 403, error: "Farmácia não autorizada" };
    }
  }

  if (role === "PROFESSIONAL") {
    const pro = await db.professionalProfile.findUnique({
      where: { userId },
      select: { specialty: true },
    });
    if (!pro || !isPharmacistSpecialty(pro.specialty)) {
      return { ok: false, status: 403, error: "Forbidden" };
    }
    if (!storeId) {
      return { ok: false, status: 400, error: "pharmacyStoreId obrigatório" };
    }
    const member = await db.pharmacyStoreMember.findFirst({
      where: { userId, pharmacyStoreId: storeId, status: "ACTIVE" },
    });
    if (!member) {
      return { ok: false, status: 403, error: "Farmacêutico não vinculado a esta farmácia" };
    }
  }

  return { ok: true, role, storeId: storeId ?? undefined };
}
