// Light symptom → specialty mapping (no AI — keyword rules, pt-BR).

import { slugify } from "@/lib/public-slugs";

export type SymptomMatch = {
  specialtySlug: string;
  matchedKeyword: string;
  score: number;
};

type SymptomRule = {
  keywords: string[];
  specialtySlug: string;
};

const RULES: SymptomRule[] = [
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

function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export function matchSymptomQuery(raw: string): SymptomMatch | null {
  const query = normalize(raw);
  if (query.length < 3) return null;

  let best: SymptomMatch | null = null;

  for (const rule of RULES) {
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

/** Fallback: try matching a specialty slug directly from free text. */
export function guessSpecialtySlugFromText(raw: string): string | null {
  const slug = slugify(raw);
  const hit = RULES.find((r) => r.specialtySlug === slug);
  if (hit) return slug;
  return null;
}
