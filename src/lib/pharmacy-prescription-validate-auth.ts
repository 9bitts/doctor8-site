import { db } from "@/lib/db";
import { isPharmacistSpecialty } from "@/lib/profession-label";

export type PharmacyPrescriptionValidateAuth =
  | { ok: true; role: string; storeId?: string }
  | { ok: false; status: 403 | 400; error: string };

/**
 * Same authorization as POST /api/pharmacy-store/prescriptions/validate.
 * PHARMACY_STORE must be an active member of the store; PROFESSIONAL must be pharmacist specialty.
 */
export async function authorizePharmacyPrescriptionValidate(
  userId: string,
  role: string,
  opts: { pharmacyStoreId?: string | null; rowPharmacyStoreId?: string | null },
): Promise<PharmacyPrescriptionValidateAuth> {
  if (role !== "PROFESSIONAL" && role !== "PHARMACY_STORE" && role !== "ADMIN") {
    return { ok: false, status: 403, error: "Forbidden" };
  }

  const storeId = opts.pharmacyStoreId || opts.rowPharmacyStoreId;
  if (!storeId && role === "PHARMACY_STORE") {
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
  }

  return { ok: true, role, storeId: storeId ?? undefined };
}
