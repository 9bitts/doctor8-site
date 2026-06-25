// Light symptom ? specialty mapping (no AI ? keyword rules, pt-BR).

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
    keywords: ["joelho", "joelhos", "artrose", "menisco", "ligamento", "fratura", "osso", "ossos", "coluna", "costas", "lombar", "h?rnia de disco", "hernia de disco"],
    specialtySlug: "ortopedista",
  },
  {
    keywords: ["pele", "acne", "espinha", "mancha", "dermatite", "eczema", "queda de cabelo", "calv?cie", "calvicie", "verruga"],
    specialtySlug: "dermatologista",
  },
  {
    keywords: ["ansiedade", "depress?o", "depressao", "ins?nia", "insonia", "p?nico", "panico", "estresse", "tristeza", "humor"],
    specialtySlug: "psiquiatra",
  },
  {
    keywords: ["terapia", "psicoterapia", "autoestima", "relacionamento", "luto", "trauma"],
    specialtySlug: "psicologo",
  },
  {
    keywords: ["cora??o", "coracao", "press?o alta", "pressao alta", "hipertens?o", "hipertensao", "palpita??o", "palpitacao"],
    specialtySlug: "cardiologista",
  },
  {
    keywords: ["diabetes", "tireoide", "horm?nio", "hormonio", "obesidade", "emagrecer", "peso"],
    specialtySlug: "endocrinologista",
  },
  {
    keywords: ["olho", "olhos", "vis?o", "visao", "miopia", "astigmatismo", "catarata"],
    specialtySlug: "oftalmologista",
  },
  {
    keywords: ["gravidez", "gr?vida", "gravida", "gestante", "menstrua??o", "menstruacao", "?tero", "utero", "ov?rio", "ovario"],
    specialtySlug: "ginecologista",
  },
  {
    keywords: ["crian?a", "crianca", "beb?", "bebe", "infantil", "pediatra"],
    specialtySlug: "pediatra",
  },
  {
    keywords: ["dieta", "nutri??o", "nutricao", "alimenta??o", "alimentacao", "emagrecimento"],
    specialtySlug: "nutricionista",
  },
  {
    keywords: ["urina", "pr?stata", "prostata", "rim", "rins", "bexiga"],
    specialtySlug: "urologista",
  },
  {
    keywords: ["dor de cabe?a", "enxaqueca", "tontura", "convuls?o", "convulsao", "formigamento"],
    specialtySlug: "neurologista",
  },
  {
    keywords: ["dent", "dente", "dentes", "gengiva", "c?rie", "carie"],
    specialtySlug: "dentista",
  },
  {
    keywords: ["fisioterapia", "reabilita??o", "reabilitacao", "p?s-operat?rio", "pos-operatorio"],
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
