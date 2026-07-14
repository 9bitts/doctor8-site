export type DrugLeafletSectionKey =
  | "identificacao"
  | "indicacoes"
  | "contraindicacoes"
  | "precaucoes"
  | "interacoes"
  | "reacoes_adversas"
  | "posologia"
  | "superdose"
  | "farmacologia"
  | "gestacao_pediatria"
  | "referencia";

export type DrugLeafletSection = {
  key: DrugLeafletSectionKey;
  title: string;
  content: string;
  defaultOpen?: boolean;
};

export type DrugLeafletSource = "anvisa" | "doctor8_mn" | "catalog";

export type DrugLeafletPayload = {
  title: string;
  subtitle?: string;
  source: DrugLeafletSource;
  externalUrl?: string;
  sections: DrugLeafletSection[];
  /** Plain-text posology excerpt for optional insert CTA */
  posologyExcerpt?: string;
};

export type DrugLeafletTarget =
  | { kind: "drug"; drugId: string; displayName: string }
  | { kind: "mn"; slug: string; displayName: string };
