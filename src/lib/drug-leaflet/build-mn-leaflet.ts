import type { MedicinaNaturalItem } from "@prisma/client";
import { anvisaBularioSearchUrl } from "./anvisa-links";
import { leafletSectionTitle } from "./section-titles";
import type { DrugLeafletPayload, DrugLeafletSection } from "./types";

function section(
  key: DrugLeafletSection["key"],
  content: string | null | undefined,
  defaultOpen?: boolean,
): DrugLeafletSection | null {
  const text = content?.trim();
  if (!text) return null;
  return {
    key,
    title: leafletSectionTitle(key),
    content: text,
    defaultOpen,
  };
}

const CATEGORIA_LABEL: Record<string, string> = {
  FITOTERAPICO: "Fitoterápico",
  FLORAL: "Floral",
  HOMEOPATIA: "Homeopatia",
  AROMATERAPIA: "Aromaterapia",
  APITERAPIA: "Apiterapia",
  CANNABIS: "Cannabis medicinal",
};

export function buildMnDrugLeaflet(item: MedicinaNaturalItem): DrugLeafletPayload {
  const identLines = [
    item.nomeCientifico ? `Nome científico: ${item.nomeCientifico}` : null,
    `Categoria: ${CATEGORIA_LABEL[item.categoriaPratica] || item.categoriaPratica}`,
    `Status regulatório: ${item.statusRegulatorio.replace(/_/g, " ")}`,
    item.renisus ? "RENISUS: sim" : null,
  ].filter(Boolean);

  const sections: DrugLeafletSection[] = [
    section("identificacao", identLines.join("\n")),
    section("indicacoes", item.indicacoes),
    section("contraindicacoes", item.contraindicacoes),
    section("precaucoes", item.precaucoes),
    section("interacoes", item.interacoesMedicamentosas),
    section("posologia", item.posologia, true),
    section("gestacao_pediatria", item.alertaGestacaoPediatria),
  ].filter((s): s is DrugLeafletSection => s !== null);

  const fontes = Array.isArray(item.fontes) ? item.fontes : [];
  if (fontes.length > 0) {
    const refText = fontes
      .map((f) => {
        if (typeof f !== "object" || f === null) return null;
        const o = f as Record<string, unknown>;
        const parts = [o.fonte, o.edicao, o.url].filter(Boolean);
        return parts.length ? parts.join(" — ") : null;
      })
      .filter(Boolean)
      .join("\n");
    const ref = section("referencia", refText || "Monografia Doctor8 — medicina natural.");
    if (ref) sections.push(ref);
  }

  return {
    title: item.nome,
    subtitle: item.nomeCientifico || undefined,
    source: "doctor8_mn",
    externalUrl: anvisaBularioSearchUrl(item.nome),
    sections,
    posologyExcerpt: item.posologia?.trim().slice(0, 500) || undefined,
  };
}
