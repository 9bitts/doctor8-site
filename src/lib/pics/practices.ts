// PICS ? Pr?ticas Integrativas e Complementares em Sa?de (PNPIC / SUS)
// 29 pr?ticas institucionalizadas (Portaria GM/MS n? 971/2006; atualiza??es 2017?2018)

export type PicCategory =
  | "corporal"
  | "energetica"
  | "mental_emocional"
  | "naturalista"
  | "tradicional";

export interface PicPractice {
  slug: string;
  category: PicCategory;
  labelPt: string;
  labelEn: string;
  labelEs: string;
  descriptionPt: string;
}

export const PIC_CATEGORIES: Record<
  PicCategory,
  { labelPt: string; labelEn: string; labelEs: string }
> = {
  corporal: {
    labelPt: "Corporais e movimento",
    labelEn: "Body and movement",
    labelEs: "Corporales y movimiento",
  },
  energetica: {
    labelPt: "Energ?ticas e vibracionais",
    labelEn: "Energy and vibrational",
    labelEs: "Energ?ticas y vibracionales",
  },
  mental_emocional: {
    labelPt: "Mental, emocional e expressivas",
    labelEn: "Mental, emotional and expressive",
    labelEs: "Mental, emocional y expresivas",
  },
  naturalista: {
    labelPt: "Naturalistas e fitoter?picas",
    labelEn: "Naturopathic and herbal",
    labelEs: "Naturalistas y fitoter?picas",
  },
  tradicional: {
    labelPt: "Medicinas tradicionais",
    labelEn: "Traditional medicines",
    labelEs: "Medicinas tradicionales",
  },
};

/** All 29 PICS recognized by Brazil's Ministry of Health (SUS/PNPIC). */
export const PICS_PRACTICES: PicPractice[] = [
  {
    slug: "acupuntura",
    category: "tradicional",
    labelPt: "Medicina Tradicional Chinesa ? Acupuntura",
    labelEn: "Traditional Chinese Medicine ? Acupuncture",
    labelEs: "Medicina Tradicional China ? Acupuntura",
    descriptionPt: "Estimula??o de pontos corporais com agulhas para equil?brio energ?tico e al?vio de sintomas.",
  },
  {
    slug: "antroposofia",
    category: "tradicional",
    labelPt: "Medicina Antropos?fica",
    labelEn: "Anthroposophic medicine",
    labelEs: "Medicina antropos?fica",
    descriptionPt: "Abordagem integrativa baseada na antroposofia, incluindo medicamentos antropos?ficos e terapias complementares.",
  },
  {
    slug: "apiterapia",
    category: "naturalista",
    labelPt: "Apiterapia",
    labelEn: "Apitherapy",
    labelEs: "Apiterapia",
    descriptionPt: "Uso terap?utico de produtos das abelhas (mel, pr?polis, veneno ap?fero, etc.).",
  },
  {
    slug: "aromaterapia",
    category: "naturalista",
    labelPt: "Aromaterapia",
    labelEn: "Aromatherapy",
    labelEs: "Aromaterapia",
    descriptionPt: "Uso de ?leos essenciais para promo??o de bem-estar f?sico e emocional.",
  },
  {
    slug: "arteterapia",
    category: "mental_emocional",
    labelPt: "Arteterapia",
    labelEn: "Art therapy",
    labelEs: "Arteterapia",
    descriptionPt: "Processo terap?utico mediado pela express?o art?stica (desenho, pintura, escultura, etc.).",
  },
  {
    slug: "ayurveda",
    category: "tradicional",
    labelPt: "Ayurveda",
    labelEn: "Ayurveda",
    labelEs: "Ayurveda",
    descriptionPt: "Medicina tradicional indiana focada em equil?brio dos doshas e estilo de vida.",
  },
  {
    slug: "biodanca",
    category: "corporal",
    labelPt: "Biodan?a",
    labelEn: "Biodanza",
    labelEs: "Biodanza",
    descriptionPt: "Sistema de integra??o afetiva, motora e existencial por meio da dan?a e do movimento.",
  },
  {
    slug: "bioenergetica",
    category: "corporal",
    labelPt: "Bioenerg?tica",
    labelEn: "Bioenergetics",
    labelEs: "Bioenerg?tica",
    descriptionPt: "Terapia corporal que trabalha tens?es musculares e bloqueios emocionais.",
  },
  {
    slug: "constelacao_familiar",
    category: "mental_emocional",
    labelPt: "Constela??o Familiar",
    labelEn: "Family constellations",
    labelEs: "Constelaci?n familiar",
    descriptionPt: "Abordagem sist?mica para compreens?o de din?micas familiares e relacionais.",
  },
  {
    slug: "cromoterapia",
    category: "energetica",
    labelPt: "Cromoterapia",
    labelEn: "Chromotherapy",
    labelEs: "Cromoterapia",
    descriptionPt: "Uso terap?utico das cores para equil?brio emocional e energ?tico.",
  },
  {
    slug: "danca_circular",
    category: "corporal",
    labelPt: "Dan?a Circular",
    labelEn: "Circle dance",
    labelEs: "Danza circular",
    descriptionPt: "Pr?tica coletiva de dan?a em c?rculo para integra??o social e bem-estar.",
  },
  {
    slug: "fitoterapia",
    category: "naturalista",
    labelPt: "Plantas Medicinais ? Fitoterapia",
    labelEn: "Medicinal plants ? Phytotherapy",
    labelEs: "Plantas medicinales ? Fitoterapia",
    descriptionPt: "Uso de plantas medicinais para preven??o e tratamento de condi??es de sa?de.",
  },
  {
    slug: "geoterapia",
    category: "naturalista",
    labelPt: "Geoterapia",
    labelEn: "Geotherapy",
    labelEs: "Geoterapia",
    descriptionPt: "Uso terap?utico de argilas e minerais naturais.",
  },
  {
    slug: "hipnoterapia",
    category: "mental_emocional",
    labelPt: "Hipnoterapia",
    labelEn: "Hypnotherapy",
    labelEs: "Hipnoterapia",
    descriptionPt: "Indu??o de estado alterado de consci?ncia para trabalho terap?utico.",
  },
  {
    slug: "homeopatia",
    category: "naturalista",
    labelPt: "Homeopatia",
    labelEn: "Homeopathy",
    labelEs: "Homeopat?a",
    descriptionPt: "Sistema terap?utico baseado no princ?pio da similitude e dilui??es homeop?ticas.",
  },
  {
    slug: "imposicao_maos",
    category: "energetica",
    labelPt: "Imposi??o de M?os",
    labelEn: "Therapeutic touch / laying on of hands",
    labelEs: "Imposici?n de manos",
    descriptionPt: "Pr?tica de canaliza??o ou direcionamento de energia pelas m?os sobre o corpo.",
  },
  {
    slug: "meditacao",
    category: "mental_emocional",
    labelPt: "Medita??o",
    labelEn: "Meditation",
    labelEs: "Meditaci?n",
    descriptionPt: "Pr?ticas contemplativas para regula??o emocional, aten??o plena e bem-estar.",
  },
  {
    slug: "musicoterapia",
    category: "mental_emocional",
    labelPt: "Musicoterapia",
    labelEn: "Music therapy",
    labelEs: "Musicoterapia",
    descriptionPt: "Uso da m?sica e seus elementos para promo??o de sa?de e reabilita??o.",
  },
  {
    slug: "naturopatia",
    category: "naturalista",
    labelPt: "Naturopatia",
    labelEn: "Naturopathy",
    labelEs: "Naturopat?a",
    descriptionPt: "Abordagem que estimula mecanismos naturais de cura (alimenta??o, h?bitos, recursos naturais).",
  },
  {
    slug: "osteopatia",
    category: "corporal",
    labelPt: "Osteopatia",
    labelEn: "Osteopathy",
    labelEs: "Osteopat?a",
    descriptionPt: "Abordagem manual do sistema musculoesquel?tico para restaurar mobilidade e fun??o.",
  },
  {
    slug: "ozonioterapia",
    category: "naturalista",
    labelPt: "Ozonioterapia",
    labelEn: "Ozone therapy",
    labelEs: "Ozonoterapia",
    descriptionPt: "Aplica??o controlada de oz?nio com finalidade terap?utica.",
  },
  {
    slug: "quiropraxia",
    category: "corporal",
    labelPt: "Quiropraxia",
    labelEn: "Chiropractic",
    labelEs: "Quiropraxia",
    descriptionPt: "Ajustes manuais da coluna vertebral e articula??es para al?vio de disfun??es.",
  },
  {
    slug: "reflexoterapia",
    category: "corporal",
    labelPt: "Reflexoterapia",
    labelEn: "Reflexology",
    labelEs: "Reflexoterapia",
    descriptionPt: "Estimula??o de pontos reflexos (p?s, m?os, orelhas) associados a ?rg?os e sistemas.",
  },
  {
    slug: "reiki",
    category: "energetica",
    labelPt: "Reiki",
    labelEn: "Reiki",
    labelEs: "Reiki",
    descriptionPt: "T?cnica japonesa de imposi??o de m?os para harmoniza??o energ?tica.",
  },
  {
    slug: "shantala",
    category: "corporal",
    labelPt: "Shantala",
    labelEn: "Shantala massage",
    labelEs: "Shantala",
    descriptionPt: "Massagem indiana para beb?s e crian?as pequenas, promovendo v?nculo e relaxamento.",
  },
  {
    slug: "terapia_comunitaria",
    category: "mental_emocional",
    labelPt: "Terapia Comunit?ria Integrativa",
    labelEn: "Integrative community therapy",
    labelEs: "Terapia comunitaria integrativa",
    descriptionPt: "Pr?tica grupal de escuta e acolhimento comunit?rio para promo??o de sa?de mental.",
  },
  {
    slug: "terapia_florais",
    category: "naturalista",
    labelPt: "Terapia de Florais",
    labelEn: "Flower essence therapy",
    labelEs: "Terapia de florais",
    descriptionPt: "Uso de ess?ncias florais (ex.: Bach) para equil?brio emocional.",
  },
  {
    slug: "termalismo",
    category: "naturalista",
    labelPt: "Termalismo Social / Crenoterapia",
    labelEn: "Social thermalism / Crenotherapy",
    labelEs: "Termalismo social / Crenoterapia",
    descriptionPt: "Uso terap?utico de ?guas minerais naturais e recursos termais.",
  },
  {
    slug: "yoga",
    category: "corporal",
    labelPt: "Yoga",
    labelEn: "Yoga",
    labelEs: "Yoga",
    descriptionPt: "Pr?tica integrativa de posturas, respira??o e medita??o para corpo e mente.",
  },
];

export function picLabel(practice: PicPractice, lang: string): string {
  if (lang.startsWith("pt")) return practice.labelPt;
  if (lang.startsWith("en")) return practice.labelEn;
  return practice.labelEs;
}

export function picBySlug(slug: string): PicPractice | undefined {
  return PICS_PRACTICES.find((p) => p.slug === slug);
}

export function picCategoryLabel(category: PicCategory, lang: string): string {
  const c = PIC_CATEGORIES[category];
  if (lang.startsWith("pt")) return c.labelPt;
  if (lang.startsWith("en")) return c.labelEn;
  return c.labelEs;
}

export const PICS_SLUGS = PICS_PRACTICES.map((p) => p.slug);
