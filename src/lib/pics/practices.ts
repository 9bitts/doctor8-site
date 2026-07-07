// PICS — Práticas Integrativas e Complementares em Saúde (PNPIC)
// 29 práticas institucionalizadas (Portaria GM/MS nº 971/2006; atualizações 2017–2018)

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
    labelPt: "Energéticas e vibracionais",
    labelEn: "Energy and vibrational",
    labelEs: "Energéticas y vibracionales",
  },
  mental_emocional: {
    labelPt: "Mental, emocional e expressivas",
    labelEn: "Mental, emotional and expressive",
    labelEs: "Mental, emocional y expresivas",
  },
  naturalista: {
    labelPt: "Naturalistas e fitoterápicas",
    labelEn: "Naturopathic and herbal",
    labelEs: "Naturalistas y fitoterápicas",
  },
  tradicional: {
    labelPt: "Medicinas tradicionais",
    labelEn: "Traditional medicines",
    labelEs: "Medicinas tradicionales",
  },
};

/** All 29 PICS recognized by Brazil's Ministry of Health (PNPIC). */
export const PICS_PRACTICES: PicPractice[] = [
  {
    slug: "acupuntura",
    category: "tradicional",
    labelPt: "Medicina Tradicional Chinesa — Acupuntura",
    labelEn: "Traditional Chinese Medicine — Acupuncture",
    labelEs: "Medicina Tradicional China — Acupuntura",
    descriptionPt: "Estimulação de pontos corporais com agulhas para equilíbrio energético e alívio de sintomas.",
  },
  {
    slug: "antroposofia",
    category: "tradicional",
    labelPt: "Medicina Antroposófica",
    labelEn: "Anthroposophic medicine",
    labelEs: "Medicina antroposófica",
    descriptionPt: "Abordagem integrativa baseada na antroposofia, incluindo medicamentos antroposóficos e terapias complementares.",
  },
  {
    slug: "apiterapia",
    category: "naturalista",
    labelPt: "Apiterapia",
    labelEn: "Apitherapy",
    labelEs: "Apiterapia",
    descriptionPt: "Uso terapêutico de produtos das abelhas (mel, própolis, veneno apífero, etc.).",
  },
  {
    slug: "aromaterapia",
    category: "naturalista",
    labelPt: "Aromaterapia",
    labelEn: "Aromatherapy",
    labelEs: "Aromaterapia",
    descriptionPt: "Uso de óleos essenciais para promoção de bem-estar físico e emocional.",
  },
  {
    slug: "arteterapia",
    category: "mental_emocional",
    labelPt: "Arteterapia",
    labelEn: "Art therapy",
    labelEs: "Arteterapia",
    descriptionPt: "Processo terapêutico mediado pela expressão artística (desenho, pintura, escultura, etc.).",
  },
  {
    slug: "ayurveda",
    category: "tradicional",
    labelPt: "Ayurveda",
    labelEn: "Ayurveda",
    labelEs: "Ayurveda",
    descriptionPt: "Medicina tradicional indiana focada em equilíbrio dos doshas e estilo de vida.",
  },
  {
    slug: "biodanca",
    category: "corporal",
    labelPt: "Biodança",
    labelEn: "Biodanza",
    labelEs: "Biodanza",
    descriptionPt: "Sistema de integração afetiva, motora e existencial por meio da dança e do movimento.",
  },
  {
    slug: "breathwork",
    category: "mental_emocional",
    labelPt: "Breathwork",
    labelEn: "Breathwork",
    labelEs: "Breathwork",
    descriptionPt: "Técnicas de respiração consciente para regulação emocional, redução de estresse e integração mente-corpo.",
  },
  {
    slug: "bioenergetica",
    category: "corporal",
    labelPt: "Bioenergética",
    labelEn: "Bioenergetics",
    labelEs: "Bioenergética",
    descriptionPt: "Terapia corporal que trabalha tensões musculares e bloqueios emocionais.",
  },
  {
    slug: "constelacao_familiar",
    category: "mental_emocional",
    labelPt: "Constelação Familiar",
    labelEn: "Family constellations",
    labelEs: "Constelación familiar",
    descriptionPt: "Abordagem sistêmica para compreensão de dinâmicas familiares e relacionais.",
  },
  {
    slug: "cromoterapia",
    category: "energetica",
    labelPt: "Cromoterapia",
    labelEn: "Chromotherapy",
    labelEs: "Cromoterapia",
    descriptionPt: "Uso terapêutico das cores para equilíbrio emocional e energético.",
  },
  {
    slug: "danca_circular",
    category: "corporal",
    labelPt: "Dança Circular",
    labelEn: "Circle dance",
    labelEs: "Danza circular",
    descriptionPt: "Prática coletiva de dança em círculo para integração social e bem-estar.",
  },
  {
    slug: "fitoterapia",
    category: "naturalista",
    labelPt: "Plantas Medicinais — Fitoterapia",
    labelEn: "Medicinal plants — Phytotherapy",
    labelEs: "Plantas medicinales — Fitoterapia",
    descriptionPt: "Uso de plantas medicinais para prevenção e tratamento de condições de saúde.",
  },
  {
    slug: "geoterapia",
    category: "naturalista",
    labelPt: "Geoterapia",
    labelEn: "Geotherapy",
    labelEs: "Geoterapia",
    descriptionPt: "Uso terapêutico de argilas e minerais naturais.",
  },
  {
    slug: "hipnoterapia",
    category: "mental_emocional",
    labelPt: "Hipnoterapia",
    labelEn: "Hypnotherapy",
    labelEs: "Hipnoterapia",
    descriptionPt: "Indução de estado alterado de consciência para trabalho terapêutico.",
  },
  {
    slug: "homeopatia",
    category: "naturalista",
    labelPt: "Homeopatia",
    labelEn: "Homeopathy",
    labelEs: "Homeopatía",
    descriptionPt: "Sistema terapêutico baseado no princípio da similitude e diluições homeopáticas.",
  },
  {
    slug: "imposicao_maos",
    category: "energetica",
    labelPt: "Imposição de Mãos",
    labelEn: "Therapeutic touch / laying on of hands",
    labelEs: "Imposición de manos",
    descriptionPt: "Prática de canalização ou direcionamento de energia pelas mãos sobre o corpo.",
  },
  {
    slug: "meditacao",
    category: "mental_emocional",
    labelPt: "Meditação",
    labelEn: "Meditation",
    labelEs: "Meditación",
    descriptionPt: "Práticas contemplativas para regulação emocional, atenção plena e bem-estar.",
  },
  {
    slug: "musicoterapia",
    category: "mental_emocional",
    labelPt: "Musicoterapia",
    labelEn: "Music therapy",
    labelEs: "Musicoterapia",
    descriptionPt: "Uso da música e seus elementos para promoção de saúde e reabilitação.",
  },
  {
    slug: "naturopatia",
    category: "naturalista",
    labelPt: "Naturopatia",
    labelEn: "Naturopathy",
    labelEs: "Naturopatía",
    descriptionPt: "Abordagem que estimula mecanismos naturais de cura (alimentação, hábitos, recursos naturais).",
  },
  {
    slug: "osteopatia",
    category: "corporal",
    labelPt: "Osteopatia",
    labelEn: "Osteopathy",
    labelEs: "Osteopatía",
    descriptionPt: "Abordagem manual do sistema musculoesquelético para restaurar mobilidade e função.",
  },
  {
    slug: "ozonioterapia",
    category: "naturalista",
    labelPt: "Ozonioterapia",
    labelEn: "Ozone therapy",
    labelEs: "Ozonoterapia",
    descriptionPt: "Aplicação controlada de ozônio com finalidade terapêutica.",
  },
  {
    slug: "quiropraxia",
    category: "corporal",
    labelPt: "Quiropraxia",
    labelEn: "Chiropractic",
    labelEs: "Quiropraxia",
    descriptionPt: "Ajustes manuais da coluna vertebral e articulações para alívio de disfunções.",
  },
  {
    slug: "reflexoterapia",
    category: "corporal",
    labelPt: "Reflexoterapia",
    labelEn: "Reflexology",
    labelEs: "Reflexoterapia",
    descriptionPt: "Estimulação de pontos reflexos (pés, mãos, orelhas) associados a órgãos e sistemas.",
  },
  {
    slug: "reiki",
    category: "energetica",
    labelPt: "Reiki",
    labelEn: "Reiki",
    labelEs: "Reiki",
    descriptionPt: "Técnica japonesa de imposição de mãos para harmonização energética.",
  },
  {
    slug: "shantala",
    category: "corporal",
    labelPt: "Shantala",
    labelEn: "Shantala massage",
    labelEs: "Shantala",
    descriptionPt: "Massagem indiana para bebês e crianças pequenas, promovendo vínculo e relaxamento.",
  },
  {
    slug: "terapia_comunitaria",
    category: "mental_emocional",
    labelPt: "Terapia Comunitária Integrativa",
    labelEn: "Integrative community therapy",
    labelEs: "Terapia comunitaria integrativa",
    descriptionPt: "Prática grupal de escuta e acolhimento comunitário para promoção de saúde mental.",
  },
  {
    slug: "terapia_florais",
    category: "naturalista",
    labelPt: "Terapia de Florais",
    labelEn: "Flower essence therapy",
    labelEs: "Terapia de florais",
    descriptionPt: "Uso de essências florais (ex.: Bach) para equilíbrio emocional.",
  },
  {
    slug: "termalismo",
    category: "naturalista",
    labelPt: "Termalismo Social / Crenoterapia",
    labelEn: "Social thermalism / Crenotherapy",
    labelEs: "Termalismo social / Crenoterapia",
    descriptionPt: "Uso terapêutico de águas minerais naturais e recursos termais.",
  },
  {
    slug: "yoga",
    category: "corporal",
    labelPt: "Yoga",
    labelEn: "Yoga",
    labelEs: "Yoga",
    descriptionPt: "Prática integrativa de posturas, respiração e meditação para corpo e mente.",
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
