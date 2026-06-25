export type MedicamentosApiBrSearchHit = {
  slug: string;
  name: string;
  priceCents: number;
  sourceUrl: string;
  isGeneric?: boolean;
};

export type MedicamentosApiBrReference = {
  slug: string;
  name: string;
  /** Regulated CMED factory price (PF), in cents (BRL). */
  priceCents: number;
  priceType: "PF_CMED";
  source: "medicamentos.api.br";
  sourceUrl: string;
  cmedTableLabel?: string;
};
