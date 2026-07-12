import { describe, expect, it, vi, beforeEach } from "vitest";

const { findFirst, proFindUnique } = vi.hoisted(() => ({
  findFirst: vi.fn(),
  proFindUnique: vi.fn(),
}));

vi.mock("@/lib/db", () => ({
  db: {
    pharmacyStoreMember: { findFirst },
    professionalProfile: { findUnique: proFindUnique },
  },
}));

vi.mock("@/lib/profession-label", () => ({
  isPharmacistSpecialty: (s: string | null | undefined) => s === "Pharmacist",
}));

import {
  authorizePharmacyPrescriptionValidate,
  resolveDispenseStoreId,
} from "@/lib/pharmacy-prescription-validate-auth";
import {
  isPharmacyStoreActive,
  PHARMACY_STORE_WRITE_BLOCKED_MESSAGE,
} from "@/lib/pharmacy-store-portal";
import {
  canAccessPharmacyPharmacistPortal,
  canAccessPharmacyStorePortal,
  canAccessPharmacyValidatePortal,
} from "@/lib/pharmacy-portal-guards";

describe("resolveDispenseStoreId", () => {
  it("prefers row store id over body param", () => {
    expect(resolveDispenseStoreId("row-store", "body-store")).toBe("row-store");
  });

  it("falls back to body when row is null", () => {
    expect(resolveDispenseStoreId(null, "body-store")).toBe("body-store");
  });
});

describe("isPharmacyStoreActive", () => {
  it("returns true only for ACTIVE", () => {
    expect(isPharmacyStoreActive("ACTIVE")).toBe(true);
    expect(isPharmacyStoreActive("PENDING_REVIEW")).toBe(false);
    expect(isPharmacyStoreActive("SUSPENDED")).toBe(false);
  });
});

describe("pharmacy portal role gates", () => {
  it("allows pharmacy store portal for PHARMACY_STORE and ADMIN", () => {
    expect(canAccessPharmacyStorePortal("PHARMACY_STORE")).toBe(true);
    expect(canAccessPharmacyStorePortal("ADMIN")).toBe(true);
    expect(canAccessPharmacyStorePortal("PATIENT")).toBe(false);
  });

  it("allows pharmacist portal only for pharmacist specialty", () => {
    expect(canAccessPharmacyPharmacistPortal("PROFESSIONAL", "Pharmacist")).toBe(true);
    expect(canAccessPharmacyPharmacistPortal("PROFESSIONAL", "General Practice")).toBe(false);
    expect(canAccessPharmacyPharmacistPortal("ADMIN")).toBe(true);
  });

  it("allows validate portal for store, pharmacist, and admin", () => {
    expect(canAccessPharmacyValidatePortal("PHARMACY_STORE")).toBe(true);
    expect(canAccessPharmacyValidatePortal("PROFESSIONAL", "Pharmacist")).toBe(true);
    expect(canAccessPharmacyValidatePortal("PATIENT")).toBe(false);
  });
});

describe("authorizePharmacyPrescriptionValidate", () => {
  beforeEach(() => {
    findFirst.mockReset();
    proFindUnique.mockReset();
  });

  it("rejects unlinked pharmacist for target store", async () => {
    proFindUnique.mockResolvedValue({ specialty: "Pharmacist" });
    findFirst.mockResolvedValue(null);

    const result = await authorizePharmacyPrescriptionValidate("user-1", "PROFESSIONAL", {
      pharmacyStoreId: "store-a",
      rowPharmacyStoreId: "store-a",
    });

    expect(result).toEqual({
      ok: false,
      status: 403,
      error: "Farmacêutico não vinculado a esta farmácia",
    });
  });

  it("allows linked pharmacist for target store", async () => {
    proFindUnique.mockResolvedValue({ specialty: "Pharmacist" });
    findFirst.mockResolvedValue({ id: "member-1" });

    const result = await authorizePharmacyPrescriptionValidate("user-1", "PROFESSIONAL", {
      rowPharmacyStoreId: "store-a",
    });

    expect(result).toEqual({ ok: true, role: "PROFESSIONAL", storeId: "store-a" });
  });

  it("rejects wrong role", async () => {
    const result = await authorizePharmacyPrescriptionValidate("user-1", "PATIENT", {
      rowPharmacyStoreId: "store-a",
    });
    expect(result).toEqual({ ok: false, status: 403, error: "Forbidden" });
  });
});

describe("PHARMACY_STORE_WRITE_BLOCKED_MESSAGE", () => {
  it("has a clear user-facing message", () => {
    expect(PHARMACY_STORE_WRITE_BLOCKED_MESSAGE).toContain("análise");
  });
});
