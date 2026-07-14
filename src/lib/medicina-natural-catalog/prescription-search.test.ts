import { describe, expect, it } from "vitest";
import { resolveMnCatalogCategoria } from "@/lib/medicina-natural-catalog/prescription-search";
import { isNaturalMedicineItemKind } from "@/lib/prescription-item-kind";

describe("prescription-search cannabis mode", () => {
  it("maps cannabis mode to CANNABIS categoria and kind", () => {
    const cat = resolveMnCatalogCategoria({
      allowFloral: true,
      phytoOnly: false,
      itemSearchMode: "cannabis",
      floralOnly: false,
    });
    expect(cat).toBe("CANNABIS");
    expect(isNaturalMedicineItemKind("cannabis")).toBe(true);
  });
});
