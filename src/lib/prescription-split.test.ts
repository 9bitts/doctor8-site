import { describe, expect, it } from "vitest";
import { splitPrescriptionMedications } from "@/lib/prescription-split";
import { classifyMedicationItem } from "@/lib/prescription-item-classifier";

describe("classifyMedicationItem", () => {
  it("maps Lista B to NRB", () => {
    expect(classifyMedicationItem({ name: "Ritalina", prescriptionType: "B1" })).toBe("NRB");
  });

  it("maps Lista C (non C2/C3) to RCE", () => {
    expect(classifyMedicationItem({ name: "Testosterona", prescriptionType: "C1" })).toBe("RCE");
  });

  it("rejects C2/C3 buckets", () => {
    expect(classifyMedicationItem({ name: "Isotretinoina", prescriptionType: "C2" })).toBe("C2_C3");
  });

  it("treats unclassified drugs as SIMPLE", () => {
    expect(classifyMedicationItem({ name: "Dipirona" })).toBe("SIMPLE");
  });
});

describe("splitPrescriptionMedications", () => {
  it("splits mixed B + common into two groups", () => {
    const result = splitPrescriptionMedications([
      { name: "Ritalina", prescriptionType: "B1" },
      { name: "Dipirona" },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.isMixed).toBe(true);
    expect(result.groups).toHaveLength(2);
    expect(result.groups[0].formKind).toBe("NRB");
    expect(result.groups[1].formKind).toBe("SIMPLE");
  });

  it("returns single NRB group for Lista B only", () => {
    const result = splitPrescriptionMedications([
      { name: "Ritalina", prescriptionType: "B1" },
    ]);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.isMixed).toBe(false);
    expect(result.groups).toEqual([
      expect.objectContaining({ formKind: "NRB" }),
    ]);
  });

  it("fails for Lista A (NRA)", () => {
    const result = splitPrescriptionMedications([
      { name: "Morfina", prescriptionType: "A1" },
    ]);
    expect(result.ok).toBe(false);
  });
});
