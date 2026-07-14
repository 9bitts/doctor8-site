/** Starter clinical protocol shortcuts for the physician Integrativa hub. */

export type IntegrativeProtocolAdd =
  | "phytotherapy"
  | "floral"
  | "homeopathy"
  | "aromatherapy"
  | "apitherapy";

export type IntegrativeProtocol = {
  id: string;
  titleKey: string;
  descKey: string;
  add: IntegrativeProtocolAdd;
  practiceSlug?: string;
  /** Maps to INTEGRATIVE_PROTOCOL_PRESETS for multi-item prefill */
  presetId: string;
};

export const INTEGRATIVE_STARTER_PROTOCOLS: IntegrativeProtocol[] = [
  {
    id: "sono",
    titleKey: "nm.pro.protocol.sono.title",
    descKey: "nm.pro.protocol.sono.desc",
    add: "phytotherapy",
    practiceSlug: "fitoterapia",
    presetId: "sono",
  },
  {
    id: "ansiedade",
    titleKey: "nm.pro.protocol.ansiedade.title",
    descKey: "nm.pro.protocol.ansiedade.desc",
    add: "floral",
    practiceSlug: "terapia-florais",
    presetId: "ansiedade",
  },
  {
    id: "imunidade",
    titleKey: "nm.pro.protocol.imunidade.title",
    descKey: "nm.pro.protocol.imunidade.desc",
    add: "apitherapy",
    practiceSlug: "apiterapia",
    presetId: "imunidade",
  },
  {
    id: "estresse",
    titleKey: "nm.pro.protocol.estresse.title",
    descKey: "nm.pro.protocol.estresse.desc",
    add: "homeopathy",
    practiceSlug: "homeopatia",
    presetId: "estresse",
  },
  {
    id: "aroma-casa",
    titleKey: "nm.pro.protocol.aroma.title",
    descKey: "nm.pro.protocol.aroma.desc",
    add: "aromatherapy",
    practiceSlug: "aromaterapia",
    presetId: "aroma-casa",
  },
];
