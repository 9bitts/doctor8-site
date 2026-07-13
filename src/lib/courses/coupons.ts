import { db } from "@/lib/db";
import type { CouponDiscountType } from "@prisma/client";

export function normalizeCouponCode(code: string): string {
  return code.trim().toUpperCase();
}

export function computeCouponDiscount(
  priceCents: number,
  discountType: CouponDiscountType,
  discountValue: number,
): { amountOffCents: number; finalCents: number } {
  let amountOffCents = 0;
  if (discountType === "PERCENT") {
    amountOffCents = Math.round((priceCents * discountValue) / 100);
  } else {
    amountOffCents = Math.min(discountValue, priceCents);
  }
  return {
    amountOffCents,
    finalCents: Math.max(0, priceCents - amountOffCents),
  };
}

export type CouponValidationResult = {
  valid: boolean;
  reason?: string;
  coupon?: {
    id: string;
    code: string;
    discountType: CouponDiscountType;
    discountValue: number;
  };
  amountOffCents: number;
  finalCents: number;
};

export async function validateCoupon(
  code: string,
  courseId: string,
  userId: string,
  priceCents: number,
): Promise<CouponValidationResult> {
  const normalized = normalizeCouponCode(code);
  if (!normalized) {
    return { valid: false, reason: "Informe um código de cupom.", amountOffCents: 0, finalCents: priceCents };
  }

  const coupon = await db.courseCoupon.findUnique({
    where: { code: normalized },
    select: {
      id: true,
      code: true,
      discountType: true,
      discountValue: true,
      courseId: true,
      maxRedemptions: true,
      redemptionCount: true,
      expiresAt: true,
      active: true,
      course: { select: { status: true } },
    },
  });

  if (!coupon) {
    return { valid: false, reason: "Cupom não encontrado.", amountOffCents: 0, finalCents: priceCents };
  }
  if (!coupon.active) {
    return { valid: false, reason: "Este cupom não está mais ativo.", amountOffCents: 0, finalCents: priceCents };
  }
  if (coupon.expiresAt && coupon.expiresAt < new Date()) {
    return { valid: false, reason: "Este cupom expirou.", amountOffCents: 0, finalCents: priceCents };
  }
  if (coupon.maxRedemptions != null && coupon.redemptionCount >= coupon.maxRedemptions) {
    return { valid: false, reason: "Este cupom atingiu o limite de usos.", amountOffCents: 0, finalCents: priceCents };
  }
  if (coupon.courseId && coupon.courseId !== courseId) {
    return { valid: false, reason: "Este cupom não vale para este curso.", amountOffCents: 0, finalCents: priceCents };
  }
  if (coupon.course && coupon.course.status !== "PUBLISHED") {
    return { valid: false, reason: "Curso não disponível para este cupom.", amountOffCents: 0, finalCents: priceCents };
  }

  const priorRedemption = await db.courseCouponRedemption.findUnique({
    where: { couponId_userId: { couponId: coupon.id, userId } },
    select: { id: true },
  });
  if (priorRedemption) {
    return { valid: false, reason: "Você já utilizou este cupom.", amountOffCents: 0, finalCents: priceCents };
  }

  const { amountOffCents, finalCents } = computeCouponDiscount(
    priceCents,
    coupon.discountType,
    coupon.discountValue,
  );

  return {
    valid: true,
    coupon: {
      id: coupon.id,
      code: coupon.code,
      discountType: coupon.discountType,
      discountValue: coupon.discountValue,
    },
    amountOffCents,
    finalCents,
  };
}
