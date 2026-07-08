import { randomBytes } from "crypto";
import { db } from "@/lib/db";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL || process.env.APP_URL || "https://doctor8.org";

export async function ensurePrescriptionToken(prescriptionId: string) {
  const existing = await db.pharmacyPrescriptionToken.findUnique({
    where: { prescriptionId },
  });
  if (existing) return existing;

  const token = randomBytes(16).toString("hex");
  return db.pharmacyPrescriptionToken.create({
    data: { prescriptionId, token },
  });
}

export function prescriptionQrUrl(token: string): string {
  return `${APP_URL}/farmacias/validar/${token}`;
}

export async function lookupPrescriptionByToken(token: string) {
  const row = await db.pharmacyPrescriptionToken.findUnique({
    where: { token },
    include: {
      prescription: {
        include: {
          document: {
            select: {
              patient: {
                select: { firstName: true, lastName: true, userId: true },
              },
            },
          },
          professional: { select: { firstName: true, lastName: true, specialty: true } },
        },
      },
      pharmacyOrder: {
        select: { id: true, status: true, pharmacyStoreId: true },
      },
    },
  });
  return row;
}
