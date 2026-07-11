import type { StatusRegulatorio } from "./item-types";

/** Status que permitem botão "Prescrever" (receita com registro/tradição notificada). */
const PRESCRITIVEL: ReadonlySet<StatusRegulatorio> = new Set([
  "MEDICAMENTO_REGISTRADO",
  "PRODUTO_TRADICIONAL_NOTIFICADO",
]);

export function podePrescrever(status: StatusRegulatorio): boolean {
  return PRESCRITIVEL.has(status);
}

export type AcaoPrescricaoMedicinaNatural = "prescrever" | "orientacao";

export function acaoPrescricaoMedicinaNatural(
  status: StatusRegulatorio,
): AcaoPrescricaoMedicinaNatural {
  return podePrescrever(status) ? "prescrever" : "orientacao";
}

export function labelAcaoPrescricao(
  status: StatusRegulatorio,
  t: (key: string) => string,
): string {
  return acaoPrescricaoMedicinaNatural(status) === "prescrever"
    ? t("nm.prescribe.actionPrescrever")
    : t("nm.prescribe.actionOrientacao");
}

/** Práticas com predominância de itens não regulados pela Anvisa (nota informativa no hub). */
export function praticaRequerNotaRegulatoria(
  categoria: string,
  itensNaoRegulados: number,
  total: number,
): boolean {
  if (total === 0) return categoria === "FLORAL";
  return itensNaoRegulados / total > 0.5;
}
