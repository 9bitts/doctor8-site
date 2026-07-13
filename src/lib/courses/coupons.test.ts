import { describe, expect, it } from "vitest";
import { computeCouponDiscount } from "@/lib/courses/coupons";
import {
  buildCourseApplicationFeeCents,
  buildCourseCheckoutPaymentIntentData,
  shouldBlockCoursePublishForConnect,
} from "@/lib/courses/checkout-payment";

describe("computeCouponDiscount", () => {
  it("applies 100% percent discount", () => {
    const result = computeCouponDiscount(10000, "PERCENT", 100);
    expect(result.amountOffCents).toBe(10000);
    expect(result.finalCents).toBe(0);
  });

  it("applies 15% percent discount", () => {
    const result = computeCouponDiscount(10000, "PERCENT", 15);
    expect(result.amountOffCents).toBe(1500);
    expect(result.finalCents).toBe(8500);
  });

  it("applies fixed discount capped at price", () => {
    const result = computeCouponDiscount(10000, "FIXED", 5000);
    expect(result.amountOffCents).toBe(5000);
    expect(result.finalCents).toBe(5000);
  });

  it("caps fixed discount at price when value exceeds price", () => {
    const result = computeCouponDiscount(10000, "FIXED", 15000);
    expect(result.amountOffCents).toBe(10000);
    expect(result.finalCents).toBe(0);
  });

  it("never returns negative final cents", () => {
    const result = computeCouponDiscount(100, "PERCENT", 100);
    expect(result.finalCents).toBeGreaterThanOrEqual(0);
  });
});

describe("buildCourseApplicationFeeCents", () => {
  it("calculates 15% platform fee", () => {
    expect(buildCourseApplicationFeeCents(10000, 15)).toBe(1500);
  });

  it("calculates fee on discounted amount", () => {
    expect(buildCourseApplicationFeeCents(8500, 15)).toBe(1275);
  });
});

describe("buildCourseCheckoutPaymentIntentData", () => {
  it("includes application_fee and transfer destination", () => {
    const data = buildCourseCheckoutPaymentIntentData(10000, 15, "acct_123");
    expect(data.application_fee_amount).toBe(1500);
    expect(data.transfer_data?.destination).toBe("acct_123");
  });
});

describe("shouldBlockCoursePublishForConnect", () => {
  it("blocks when connect enabled, paid course, and connect not active", () => {
    expect(shouldBlockCoursePublishForConnect(true, 5000, "pending")).toBe(true);
    expect(shouldBlockCoursePublishForConnect(true, 5000, "none")).toBe(true);
  });

  it("allows when connect active", () => {
    expect(shouldBlockCoursePublishForConnect(true, 5000, "active")).toBe(false);
  });

  it("allows free courses without connect", () => {
    expect(shouldBlockCoursePublishForConnect(true, 0, "none")).toBe(false);
  });

  it("allows when connect disabled", () => {
    expect(shouldBlockCoursePublishForConnect(false, 5000, "none")).toBe(false);
  });
});
