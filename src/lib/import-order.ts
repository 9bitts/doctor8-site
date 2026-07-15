import type { ImportOrderStatus } from "@prisma/client";
import { db } from "@/lib/db";

export const IMPORT_MAX_TREATMENT_DAYS = 90;

/** Statuses visible to the distributor (after Doctor8 fee is paid). */
export const DISTRIBUTOR_VISIBLE_STATUSES: ImportOrderStatus[] = [
  "PAID",
  "READY_TO_SHIP",
  "SHIPPED",
  "DELIVERED",
];

export function maxQuantityForProduct(daysPerUnit: number, treatmentDays = IMPORT_MAX_TREATMENT_DAYS): number {
  const per = Math.max(1, daysPerUnit);
  return Math.max(1, Math.ceil(treatmentDays / per));
}

export function computeFeeBrlCents(params: {
  productUsdCents: number;
  shippingUsdCents: number;
  quantity: number;
  feePercent: number;
  /** Approximate USD→BRL for fee display; ops can adjust. */
  usdToBrlRate?: number;
}): number {
  const rate = params.usdToBrlRate ?? 5.5;
  const productTotalUsd =
    (params.productUsdCents * params.quantity + params.shippingUsdCents) / 100;
  const feeUsd = productTotalUsd * (params.feePercent / 100);
  return Math.round(feeUsd * rate * 100);
}

export async function recordImportOrderEvent(params: {
  orderId: string;
  fromStatus?: string | null;
  toStatus: string;
  note?: string | null;
  actorUserId?: string | null;
}) {
  await db.importOrderEvent.create({
    data: {
      orderId: params.orderId,
      fromStatus: params.fromStatus ?? null,
      toStatus: params.toStatus,
      note: params.note ?? null,
      actorUserId: params.actorUserId ?? null,
    },
  });
}

export async function assignActiveDistributorId(): Promise<string | null> {
  const d = await db.distributor.findFirst({
    where: { status: "ACTIVE" },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  return d?.id ?? null;
}

export const IMPORT_STATUS_LABEL: Record<ImportOrderStatus, string> = {
  DRAFT: "Rascunho",
  DOCUMENTS_SUBMITTED: "Documentos enviados",
  DOCUMENTS_NEEDS_FIX: "Corrigir documentos",
  DOCUMENTS_APPROVED: "Documentos aprovados",
  ANVISA_PENDING: "Anvisa em análise",
  ANVISA_AUTHORIZED: "Anvisa autorizada",
  ANVISA_REJECTED: "Anvisa negada",
  PAYMENT_PENDING: "Aguardando pagamento",
  PAID: "Pago",
  READY_TO_SHIP: "Pronto para envio",
  SHIPPED: "Enviado",
  DELIVERED: "Entregue",
  CANCELLED: "Cancelado",
};
