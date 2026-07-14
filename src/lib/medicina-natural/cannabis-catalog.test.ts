import { describe, expect, it } from "vitest";
import { buildCannabisCatalogItems } from "@/lib/medicina-natural/cannabis-catalog";
import { CannabisLoteInputSchema } from "@/lib/medicina-natural/item-types";
import { parseDetalhesCannabis } from "@/lib/medicina-natural/cannabis-display";
import * as fs from "fs";
import * as path from "path";

describe("cannabis catalog seed", () => {
  const items = buildCannabisCatalogItems();

  it("generates 50 generic items with unique slugs", () => {
    expect(items).toHaveLength(50);
    const slugs = items.map((i) => i.slug);
    expect(new Set(slugs).size).toBe(50);
  });

  it("tipoReceituario is coherent with thcAcimaLimite", () => {
    for (const item of items) {
      const det = parseDetalhesCannabis(item.detalhesEspecificos);
      expect(det).not.toBeNull();
      if (det!.thcAcimaLimite) {
        expect(det!.tipoReceituario).toBe("A");
      } else {
        expect(det!.tipoReceituario).toBe("B");
      }
    }
  });

  it("seed.json parses with CannabisLoteInputSchema", () => {
    const file = path.join(process.cwd(), "data", "cannabis", "seed.json");
    expect(fs.existsSync(file)).toBe(true);
    const parsed = CannabisLoteInputSchema.parse(JSON.parse(fs.readFileSync(file, "utf8")));
    expect(parsed.itens).toHaveLength(50);
  });

  it("searchText indexes concentration and spectrum terms", () => {
    const cbd200 = items.find((i) => i.slug.includes("cbd-isolado-200"));
    expect(cbd200?.searchText).toMatch(/cbd/);
    expect(cbd200?.searchText).toMatch(/200/);

    const full = items.find((i) => i.slug.includes("full-50"));
    expect(full?.searchText).toMatch(/full spectrum/);

    const balanced = items.find((i) => i.slug.includes("balanceado-25-25"));
    expect(balanced?.searchText).toMatch(/1:1/);
  });
});
