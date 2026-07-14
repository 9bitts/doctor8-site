import { describe, expect, it } from "vitest";
import { extractPosologyExcerpt, parseBulaTextToSections } from "@/lib/drug-leaflet/parse-bula-text";

describe("parseBulaTextToSections", () => {
  it("splits numbered ANVISA headings into sections", () => {
    const raw = `
1. IDENTIFICAÇÃO DO MEDICAMENTO
Nome: Teste 500 mg

2. INDICAÇÕES
Tratamento de infecções.

3. CONTRAINDICAÇÕES
Hipersensibilidade.

7. POSOLOGIA E MODO DE USAR
Adultos: 500 mg a cada 8 horas.
`.trim();

    const sections = parseBulaTextToSections(raw);
    expect(sections.some((s) => s.key === "indicacoes")).toBe(true);
    expect(sections.some((s) => s.key === "posologia")).toBe(true);
    expect(sections.some((s) => s.key === "contraindicacoes")).toBe(true);

    const pos = sections.find((s) => s.key === "posologia");
    expect(pos?.content).toContain("500 mg");
    expect(pos?.defaultOpen).toBe(true);
  });

  it("extracts posology excerpt", () => {
    const sections = parseBulaTextToSections(
      "7. POSOLOGIA\nAdultos: 1 comprimido 8/8h por 7 dias.",
    );
    expect(extractPosologyExcerpt(sections)).toContain("8/8h");
  });
});
