// Symptom → specialty mapping (keyword rules, pt / en / es).

import { slugify } from "@/lib/public-slugs";

export type SymptomLang = "pt" | "en" | "es";

export type SymptomMatch = {
  specialtySlug: string;
  matchedKeyword: string;
  score: number;
};

type SymptomRule = {
  keywords: string[];
  specialtySlug: string;
};

const PT_RULES: SymptomRule[] = [
  {
    keywords: ["joelho", "joelhos", "artrose", "menisco", "ligamento", "fratura", "osso", "ossos", "coluna", "costas", "lombar", "hérnia de disco", "hernia de disco"],
    specialtySlug: "ortopedista",
  },
  {
    keywords: ["pele", "acne", "espinha", "mancha", "dermatite", "eczema", "queda de cabelo", "calvície", "calvicie", "verruga"],
    specialtySlug: "dermatologista",
  },
  {
    keywords: ["ansiedade", "depressão", "depressao", "insônia", "insonia", "pânico", "panico", "estresse", "tristeza", "humor"],
    specialtySlug: "psiquiatra",
  },
  {
    keywords: ["terapia", "psicoterapia", "autoestima", "relacionamento", "luto", "trauma"],
    specialtySlug: "psicologo",
  },
  {
    keywords: ["coração", "coracao", "pressão alta", "pressao alta", "hipertensão", "hipertensao", "palpitação", "palpitacao"],
    specialtySlug: "cardiologista",
  },
  {
    keywords: ["diabetes", "tireoide", "hormônio", "hormonio", "obesidade", "emagrecer", "peso"],
    specialtySlug: "endocrinologista",
  },
  {
    keywords: ["olho", "olhos", "visão", "visao", "miopia", "astigmatismo", "catarata"],
    specialtySlug: "oftalmologista",
  },
  {
    keywords: ["gravidez", "grávida", "gravida", "gestante", "menstruação", "menstruacao", "útero", "utero", "ovário", "ovario"],
    specialtySlug: "ginecologista",
  },
  {
    keywords: ["criança", "crianca", "bebê", "bebe", "infantil", "pediatra"],
    specialtySlug: "pediatra",
  },
  {
    keywords: ["dieta", "nutrição", "nutricao", "alimentação", "alimentacao", "emagrecimento"],
    specialtySlug: "nutricionista",
  },
  {
    keywords: ["urina", "próstata", "prostata", "rim", "rins", "bexiga"],
    specialtySlug: "urologista",
  },
  {
    keywords: ["dor de cabeça", "enxaqueca", "tontura", "convulsão", "convulsao", "formigamento"],
    specialtySlug: "neurologista",
  },
  {
    keywords: ["dent", "dente", "dentes", "gengiva", "cárie", "carie"],
    specialtySlug: "dentista",
  },
  {
    keywords: ["fisioterapia", "reabilitação", "reabilitacao", "pós-operatório", "pos-operatorio"],
    specialtySlug: "fisioterapeuta",
  },
];

const EN_RULES: SymptomRule[] = [
  { keywords: ["knee", "joint pain", "arthritis", "meniscus", "fracture", "bone", "spine", "back pain", "herniated disc"], specialtySlug: "ortopedista" },
  { keywords: ["skin", "acne", "rash", "eczema", "hair loss", "dermatitis", "wart"], specialtySlug: "dermatologista" },
  { keywords: ["anxiety", "depression", "insomnia", "panic", "stress", "mood"], specialtySlug: "psiquiatra" },
  { keywords: ["therapy", "psychotherapy", "self-esteem", "grief", "trauma"], specialtySlug: "psicologo" },
  { keywords: ["heart", "high blood pressure", "hypertension", "palpitation", "chest pain"], specialtySlug: "cardiologista" },
  { keywords: ["diabetes", "thyroid", "hormone", "obesity", "weight loss"], specialtySlug: "endocrinologista" },
  { keywords: ["eye", "vision", "myopia", "astigmatism", "cataract"], specialtySlug: "oftalmologista" },
  { keywords: ["pregnancy", "pregnant", "period", "menstruation", "uterus", "ovary"], specialtySlug: "ginecologista" },
  { keywords: ["child", "baby", "infant", "pediatric"], specialtySlug: "pediatra" },
  { keywords: ["diet", "nutrition", "eating", "weight"], specialtySlug: "nutricionista" },
  { keywords: ["urine", "prostate", "kidney", "bladder"], specialtySlug: "urologista" },
  { keywords: ["headache", "migraine", "dizziness", "seizure", "numbness"], specialtySlug: "neurologista" },
  { keywords: ["tooth", "teeth", "gum", "cavity", "dental"], specialtySlug: "dentista" },
  { keywords: ["physiotherapy", "rehabilitation", "post-op"], specialtySlug: "fisioterapeuta" },
];

const ES_RULES: SymptomRule[] = [
  { keywords: ["rodilla", "artrosis", "menisco", "fractura", "hueso", "columna", "dolor de espalda", "hernia discal"], specialtySlug: "ortopedista" },
  { keywords: ["piel", "acné", "acne", "eczema", "caída de cabello", "dermatitis", "verruga"], specialtySlug: "dermatologista" },
  { keywords: ["ansiedad", "depresión", "depresion", "insomnio", "pánico", "panico", "estrés", "estres"], specialtySlug: "psiquiatra" },
  { keywords: ["terapia", "psicoterapia", "autoestima", "duelo", "trauma"], specialtySlug: "psicologo" },
  { keywords: ["corazón", "corazon", "presión alta", "presion alta", "hipertensión", "hipertension", "palpitación"], specialtySlug: "cardiologista" },
  { keywords: ["diabetes", "tiroides", "hormona", "obesidad", "peso"], specialtySlug: "endocrinologista" },
  { keywords: ["ojo", "ojos", "visión", "vision", "miopía", "miopia", "catarata"], specialtySlug: "oftalmologista" },
  { keywords: ["embarazo", "embarazada", "menstruación", "menstruacion", "útero", "utero"], specialtySlug: "ginecologista" },
  { keywords: ["niño", "nino", "bebé", "bebe", "infantil", "pediatra"], specialtySlug: "pediatra" },
  { keywords: ["dieta", "nutrición", "nutricion", "alimentación", "alimentacion"], specialtySlug: "nutricionista" },
  { keywords: ["orina", "próstata", "prostata", "riñón", "rinon", "vejiga"], specialtySlug: "urologista" },
  { keywords: ["dolor de cabeza", "migraña", "migrana", "mareo", "convulsión", "convulsion"], specialtySlug: "neurologista" },
  { keywords: ["diente", "dientes", "encía", "encia", "caries"], specialtySlug: "dentista" },
  { keywords: ["fisioterapia", "rehabilitación", "rehabilitacion"], specialtySlug: "fisioterapeuta" },
];

const RULES_BY_LANG: Record<SymptomLang, SymptomRule[]> = {
  pt: PT_RULES,
  en: EN_RULES,
  es: ES_RULES,
};

const CACHE_TTL_MS = 12 * 60 * 60 * 1000;
const cache = new Map<string, { match: SymptomMatch | null; ts: number }>();

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function normalizeLang(raw: string | null | undefined): SymptomLang {
  if (raw === "en" || raw === "es" || raw === "pt") return raw;
  if (raw?.startsWith("en")) return "en";
  if (raw?.startsWith("es")) return "es";
  return "pt";
}

function rulesForLang(lang: SymptomLang): SymptomRule[] {
  if (lang === "pt") return PT_RULES;
  return [...RULES_BY_LANG[lang], ...PT_RULES];
}

function matchAgainstRules(query: string, rules: SymptomRule[]): SymptomMatch | null {
  let best: SymptomMatch | null = null;

  for (const rule of rules) {
    for (const kw of rule.keywords) {
      const nkw = normalize(kw);
      if (query.includes(nkw)) {
        const score = nkw.length;
        if (!best || score > best.score) {
          best = {
            specialtySlug: rule.specialtySlug,
            matchedKeyword: kw,
            score,
          };
        }
      }
    }
  }

  return best;
}

export function matchSymptomQuery(raw: string, lang: SymptomLang | string = "pt"): SymptomMatch | null {
  const query = normalize(raw);
  if (query.length < 3) return null;

  const l = normalizeLang(typeof lang === "string" ? lang : "pt");
  const cacheKey = `${l}:${query}`;
  const hit = cache.get(cacheKey);
  if (hit && Date.now() - hit.ts < CACHE_TTL_MS) return hit.match;

  const match = matchAgainstRules(query, rulesForLang(l));
  cache.set(cacheKey, { match, ts: Date.now() });
  return match;
}

/** Fallback: try matching a specialty slug directly from free text. */
export function guessSpecialtySlugFromText(raw: string): string | null {
  const slug = slugify(raw);
  const all = [...PT_RULES, ...EN_RULES, ...ES_RULES];
  const hit = all.find((r) => r.specialtySlug === slug);
  if (hit) return slug;
  return null;
}
