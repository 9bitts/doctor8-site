import catalogJson from "@/data/condition-seo-catalog.json";

export const CONDITION_WHATSAPP_E164 = "5531971720053";
export const CONDITION_WHATSAPP_DISPLAY = "+55 31 97172-0053";

/** Slugs already served by dedicated landings — skip dynamic [slug] */
export const CONDITION_RESERVED_SLUGS = new Set([
  "hipertensao",
  "diabetes",
  "ansiedade",
  "depressao",
]);

export type ConditionCategoria =
  | "Cardiovascular"
  | "Endócrino"
  | "Saúde Mental"
  | "Respiratório"
  | "Gastrointestinal"
  | "Musculoesquelético"
  | "Dermatológico"
  | "Saúde da Mulher"
  | "Saúde do Homem"
  | "Infecções"
  | "Neurológico"
  | "Urinário"
  | "Nutrição"
  | "Autoimune"
  | "Alergia"
  | "Oftalmológico"
  | "Saúde Sexual"
  | "Pediátrico"
  | "Odontológico"
  | "Oncológico"
  | string;

export type ConditionCatalogEntry = {
  slug: string;
  nome: string;
  nomePopular: string;
  cid10: string;
  especialidade: string;
  categoria: ConditionCategoria;
};

export type ConditionAccent = {
  key: string;
  /** Tailwind color stem e.g. rose, teal */
  stem: string;
  heroEyebrow: string;
  heroHighlight: string;
  heroSub: string;
  section: string;
  icon: string;
  step: string;
  darkEyebrow: string;
  darkItem: string;
  ctaBg: string;
  ctaText: string;
  ctaSub: string;
  ctaBtn: string;
  ctaBtnHover: string;
  borderSoft: string;
  hoverBg: string;
  footnote: string;
};

/**
 * Contrast-safe accents (WCAG-ish):
 * - On dark (hero/why/cta): light tints (*-200/*-300) or white/slate-100
 * - On light sections: dark tones (*-700/*-800), never pale yellow/lime on white
 * - CTA bands: dark enough for white titles; footnotes use *-100/*-200
 */
function accent(
  stem: string,
  opts: {
    section: string;
    icon: string;
    step: string;
    heroAccent: string;
    darkAccent: string;
    ctaBg: string;
    ctaSub: string;
    ctaBtnText: string;
    ctaBtnHover: string;
    footnote: string;
  }
): ConditionAccent {
  return {
    key: stem,
    stem,
    heroEyebrow: opts.heroAccent,
    heroHighlight: opts.heroAccent,
    heroSub: "text-slate-200",
    section: opts.section,
    icon: opts.icon,
    step: opts.step,
    darkEyebrow: opts.darkAccent,
    darkItem: opts.darkAccent,
    ctaBg: opts.ctaBg,
    ctaText: opts.ctaBtnText,
    ctaSub: opts.ctaSub,
    ctaBtn: `bg-white ${opts.ctaBtnText}`,
    ctaBtnHover: opts.ctaBtnHover,
    borderSoft: `border-${stem}-400/40`,
    hoverBg: `hover:bg-${stem}-500/15`,
    footnote: opts.footnote,
  };
}

const ACCENTS: Record<string, ConditionAccent> = {
  Cardiovascular: accent("rose", {
    section: "text-rose-800",
    icon: "text-rose-700",
    step: "text-rose-700",
    heroAccent: "text-rose-200",
    darkAccent: "text-rose-200",
    ctaBg: "bg-rose-700",
    ctaSub: "text-rose-50",
    ctaBtnText: "text-rose-900",
    ctaBtnHover: "hover:bg-rose-50",
    footnote: "text-rose-100",
  }),
  "Endócrino": accent("teal", {
    section: "text-teal-800",
    icon: "text-teal-700",
    step: "text-teal-700",
    heroAccent: "text-teal-200",
    darkAccent: "text-teal-200",
    ctaBg: "bg-teal-800",
    ctaSub: "text-teal-50",
    ctaBtnText: "text-teal-900",
    ctaBtnHover: "hover:bg-teal-50",
    footnote: "text-teal-100",
  }),
  "Saúde Mental": accent("violet", {
    section: "text-violet-800",
    icon: "text-violet-700",
    step: "text-violet-700",
    heroAccent: "text-violet-200",
    darkAccent: "text-violet-200",
    ctaBg: "bg-violet-700",
    ctaSub: "text-violet-50",
    ctaBtnText: "text-violet-900",
    ctaBtnHover: "hover:bg-violet-50",
    footnote: "text-violet-100",
  }),
  Respiratório: accent("sky", {
    section: "text-sky-800",
    icon: "text-sky-700",
    step: "text-sky-700",
    heroAccent: "text-sky-200",
    darkAccent: "text-sky-200",
    ctaBg: "bg-sky-800",
    ctaSub: "text-sky-50",
    ctaBtnText: "text-sky-900",
    ctaBtnHover: "hover:bg-sky-50",
    footnote: "text-sky-100",
  }),
  Gastrointestinal: accent("amber", {
    section: "text-amber-900",
    icon: "text-amber-800",
    step: "text-amber-800",
    heroAccent: "text-amber-200",
    darkAccent: "text-amber-200",
    ctaBg: "bg-amber-800",
    ctaSub: "text-amber-50",
    ctaBtnText: "text-amber-950",
    ctaBtnHover: "hover:bg-amber-50",
    footnote: "text-amber-100",
  }),
  Musculoesquelético: accent("orange", {
    section: "text-orange-900",
    icon: "text-orange-800",
    step: "text-orange-800",
    heroAccent: "text-orange-200",
    darkAccent: "text-orange-200",
    ctaBg: "bg-orange-800",
    ctaSub: "text-orange-50",
    ctaBtnText: "text-orange-950",
    ctaBtnHover: "hover:bg-orange-50",
    footnote: "text-orange-100",
  }),
  Dermatológico: accent("fuchsia", {
    section: "text-fuchsia-800",
    icon: "text-fuchsia-700",
    step: "text-fuchsia-700",
    heroAccent: "text-fuchsia-200",
    darkAccent: "text-fuchsia-200",
    ctaBg: "bg-fuchsia-800",
    ctaSub: "text-fuchsia-50",
    ctaBtnText: "text-fuchsia-950",
    ctaBtnHover: "hover:bg-fuchsia-50",
    footnote: "text-fuchsia-100",
  }),
  "Saúde da Mulher": accent("pink", {
    section: "text-pink-800",
    icon: "text-pink-700",
    step: "text-pink-700",
    heroAccent: "text-pink-200",
    darkAccent: "text-pink-200",
    ctaBg: "bg-pink-700",
    ctaSub: "text-pink-50",
    ctaBtnText: "text-pink-900",
    ctaBtnHover: "hover:bg-pink-50",
    footnote: "text-pink-100",
  }),
  "Saúde do Homem": accent("blue", {
    section: "text-blue-800",
    icon: "text-blue-700",
    step: "text-blue-700",
    heroAccent: "text-blue-200",
    darkAccent: "text-blue-200",
    ctaBg: "bg-blue-800",
    ctaSub: "text-blue-50",
    ctaBtnText: "text-blue-950",
    ctaBtnHover: "hover:bg-blue-50",
    footnote: "text-blue-100",
  }),
  Infecções: accent("red", {
    section: "text-red-800",
    icon: "text-red-700",
    step: "text-red-700",
    heroAccent: "text-red-200",
    darkAccent: "text-red-200",
    ctaBg: "bg-red-800",
    ctaSub: "text-red-50",
    ctaBtnText: "text-red-950",
    ctaBtnHover: "hover:bg-red-50",
    footnote: "text-red-100",
  }),
  Neurológico: accent("indigo", {
    section: "text-indigo-800",
    icon: "text-indigo-700",
    step: "text-indigo-700",
    heroAccent: "text-indigo-200",
    darkAccent: "text-indigo-200",
    ctaBg: "bg-indigo-800",
    ctaSub: "text-indigo-50",
    ctaBtnText: "text-indigo-950",
    ctaBtnHover: "hover:bg-indigo-50",
    footnote: "text-indigo-100",
  }),
  Urinário: accent("cyan", {
    section: "text-cyan-800",
    icon: "text-cyan-700",
    step: "text-cyan-700",
    heroAccent: "text-cyan-200",
    darkAccent: "text-cyan-200",
    ctaBg: "bg-cyan-800",
    ctaSub: "text-cyan-50",
    ctaBtnText: "text-cyan-950",
    ctaBtnHover: "hover:bg-cyan-50",
    footnote: "text-cyan-100",
  }),
  // emerald instead of lime — lime fails on white and on dark mid-tones
  Nutrição: accent("emerald", {
    section: "text-emerald-800",
    icon: "text-emerald-700",
    step: "text-emerald-700",
    heroAccent: "text-emerald-200",
    darkAccent: "text-emerald-200",
    ctaBg: "bg-emerald-800",
    ctaSub: "text-emerald-50",
    ctaBtnText: "text-emerald-950",
    ctaBtnHover: "hover:bg-emerald-50",
    footnote: "text-emerald-100",
  }),
  Autoimune: accent("purple", {
    section: "text-purple-800",
    icon: "text-purple-700",
    step: "text-purple-700",
    heroAccent: "text-purple-200",
    darkAccent: "text-purple-200",
    ctaBg: "bg-purple-800",
    ctaSub: "text-purple-50",
    ctaBtnText: "text-purple-950",
    ctaBtnHover: "hover:bg-purple-50",
    footnote: "text-purple-100",
  }),
  // amber instead of yellow — yellow-600/700 on white fails contrast
  Alergia: accent("amber", {
    section: "text-amber-900",
    icon: "text-amber-800",
    step: "text-amber-800",
    heroAccent: "text-amber-200",
    darkAccent: "text-amber-200",
    ctaBg: "bg-amber-800",
    ctaSub: "text-amber-50",
    ctaBtnText: "text-amber-950",
    ctaBtnHover: "hover:bg-amber-50",
    footnote: "text-amber-100",
  }),
  Oftalmológico: accent("sky", {
    section: "text-sky-800",
    icon: "text-sky-700",
    step: "text-sky-700",
    heroAccent: "text-sky-200",
    darkAccent: "text-sky-200",
    ctaBg: "bg-sky-800",
    ctaSub: "text-sky-50",
    ctaBtnText: "text-sky-900",
    ctaBtnHover: "hover:bg-sky-50",
    footnote: "text-sky-100",
  }),
  "Saúde Sexual": accent("rose", {
    section: "text-rose-800",
    icon: "text-rose-700",
    step: "text-rose-700",
    heroAccent: "text-rose-200",
    darkAccent: "text-rose-200",
    ctaBg: "bg-rose-800",
    ctaSub: "text-rose-50",
    ctaBtnText: "text-rose-950",
    ctaBtnHover: "hover:bg-rose-50",
    footnote: "text-rose-100",
  }),
  Pediátrico: accent("cyan", {
    section: "text-cyan-800",
    icon: "text-cyan-700",
    step: "text-cyan-700",
    heroAccent: "text-cyan-200",
    darkAccent: "text-cyan-200",
    ctaBg: "bg-cyan-800",
    ctaSub: "text-cyan-50",
    ctaBtnText: "text-cyan-950",
    ctaBtnHover: "hover:bg-cyan-50",
    footnote: "text-cyan-100",
  }),
  Odontológico: accent("stone", {
    section: "text-stone-800",
    icon: "text-stone-700",
    step: "text-stone-700",
    heroAccent: "text-stone-200",
    darkAccent: "text-stone-200",
    ctaBg: "bg-stone-800",
    ctaSub: "text-stone-100",
    ctaBtnText: "text-stone-900",
    ctaBtnHover: "hover:bg-stone-100",
    footnote: "text-stone-200",
  }),
  Oncológico: accent("slate", {
    section: "text-slate-800",
    icon: "text-slate-700",
    step: "text-slate-700",
    heroAccent: "text-slate-200",
    darkAccent: "text-slate-200",
    ctaBg: "bg-slate-900",
    ctaSub: "text-slate-100",
    ctaBtnText: "text-slate-900",
    ctaBtnHover: "hover:bg-slate-100",
    footnote: "text-slate-200",
  }),
};

const DEFAULT_ACCENT = ACCENTS.Cardiovascular;

/** Conditions where teleconsulta is follow-up / triage, never emergency replacement */
const EMERGENCY_SLUGS = new Set([
  "dor-no-peito",
  "angina-pectoris",
  "pos-infarto",
  "avc",
  "ataque-isquemico-transitorio",
  "embolia-pulmonar",
  "apendicite",
  "anafilaxia",
  "pneumonia",
  "covid-19",
]);

function categoriaSlug(categoria: string): string {
  return categoria
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export const CONDITION_CATALOG = catalogJson as ConditionCatalogEntry[];

const bySlug = new Map(CONDITION_CATALOG.map((c) => [c.slug, c]));

export function getConditionBySlug(slug: string): ConditionCatalogEntry | undefined {
  return bySlug.get(slug);
}

export function listConditionSlugsForStatic(): string[] {
  return CONDITION_CATALOG.map((c) => c.slug).filter(
    (s) => !CONDITION_RESERVED_SLUGS.has(s)
  );
}

export function isConditionSeoPath(pathname: string): boolean {
  if (!pathname.startsWith("/") || pathname.includes("/", 1)) return false;
  const slug = pathname.slice(1);
  if (!slug || CONDITION_RESERVED_SLUGS.has(slug)) return false;
  return bySlug.has(slug);
}

export function conditionWhatsAppHref(slug: string, nomePopular: string, message?: string): string {
  const base = `https://wa.me/${CONDITION_WHATSAPP_E164}`;
  const text =
    message?.trim() ||
    `Olá, vi a página /${slug} da Doctor8 e quero marcar uma consulta sobre ${nomePopular}.`;
  return `${base}?text=${encodeURIComponent(text)}`;
}

export function getConditionAccent(categoria: string): ConditionAccent {
  return ACCENTS[categoria] ?? DEFAULT_ACCENT;
}

export type ConditionLandingContent = {
  entry: ConditionCatalogEntry;
  accent: ConditionAccent;
  meta: { title: string; description: string };
  hero: {
    eyebrow: string;
    title: string;
    titleHighlight: string;
    subtitle: string;
    primaryCta: { label: string; href: string };
    secondaryCta: { label: string };
    browseCta: { label: string; href: string };
    emergencyNote: string;
    image: { src: string; alt: string };
  };
  whenToBook: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: { title: string; body: string }[];
  };
  howItWorks: {
    eyebrow: string;
    title: string;
    subtitle: string;
    image: { src: string; alt: string };
    steps: { step: string; title: string; body: string }[];
  };
  care: {
    eyebrow: string;
    title: string;
    subtitle: string;
    items: { title: string; body: string }[];
  };
  why: {
    eyebrow: string;
    title: string;
    image: { src: string; alt: string };
    items: { label: string; body: string }[];
  };
  faq: { title: string; items: { q: string; a: string }[] };
  finalCta: {
    title: string;
    subtitle: string;
    primary: { label: string; href: string };
    secondary: { label: string };
    browse: { label: string; href: string };
  };
  related: { label: string; href: string }[];
};

function emergencyNoteFor(entry: ConditionCatalogEntry): string {
  if (EMERGENCY_SLUGS.has(entry.slug) || entry.categoria === "Oncológico") {
    return `Sinais de emergência (dor intensa, falta de ar grave, perda de consciência, sangramento intenso)? Ligue 192. Esta página é para orientação e consulta de acompanhamento sobre ${entry.nomePopular.toLowerCase()} — não substitui pronto-socorro.`;
  }
  if (entry.categoria === "Saúde Mental") {
    return `Em crise suicida ou risco imediato, ligue 188 (CVV) ou 192. A teleconsulta ajuda no acompanhamento de ${entry.nomePopular.toLowerCase()}, não na emergência.`;
  }
  return `Piora rápida, falta de ar grave, dor intensa ou sinais de emergência? Ligue 192. Use a Doctor8 para avaliar e acompanhar ${entry.nomePopular.toLowerCase()} com segurança.`;
}

function buildWhenToBook(entry: ConditionCatalogEntry) {
  const pop = entry.nomePopular;
  const esp = entry.especialidade;
  return {
    eyebrow: "Quando marcar",
    title: `Sinais de que ${pop.toLowerCase()} pede avaliação`,
    subtitle: `Não espere o quadro piorar. Um médico de ${esp.toLowerCase()} (ou clínico) orienta o próximo passo com base no seu histórico.`,
    items: [
      {
        title: `Sintomas de ${pop.toLowerCase()} que não melhoram`,
        body: `Quando o desconforto persiste ou volta com frequência, vale uma consulta — não só pesquisar na internet.`,
      },
      {
        title: "Precisa de orientação ou receita com avaliação",
        body: "Medicação contínua e ajustes de tratamento pedem avaliação médica. A teleconsulta pode renovar com segurança quando indicado.",
      },
      {
        title: "Exames ou diagnóstico recente",
        body: `Leve resultados e dúvidas para o especialista em ${esp.toLowerCase()} interpretar e montar o plano.`,
      },
      {
        title: "Histórico familiar ou fatores de risco",
        body: `Na categoria ${entry.categoria.toLowerCase()}, prevenção e acompanhamento precoce fazem diferença.`,
      },
    ],
  };
}

function buildCareItems(entry: ConditionCatalogEntry) {
  return [
    {
      title: entry.especialidade,
      body: `Referência principal para ${entry.nomePopular.toLowerCase()} (CID ${entry.cid10}).`,
    },
    {
      title: "Clínico geral",
      body: "Porta de entrada quando o quadro é inicial, inespecífico ou precisa de encaminhamento.",
    },
    {
      title: "Receita digital",
      body: "Quando clinicamente indicado, a prescrição segue válida para farmácia — com histórico no prontuário.",
    },
    {
      title: "Acompanhamento",
      body: "Retornos e ajustes no mesmo ecossistema Doctor8, sem recomeçar do zero a cada visita.",
    },
  ];
}

function buildWhy(entry: ConditionCatalogEntry) {
  return {
    eyebrow: "Por que agir",
    title: `${entry.nome} não precisa ser adiado`,
    image: {
      src: `/marketing/condicoes/_shared/cuidado.png`,
      alt: `Cuidado contínuo em saúde — ${entry.nomePopular}`,
    },
    items: [
      {
        label: "Clareza",
        body: `Saber se é ${entry.nomePopular.toLowerCase()} (ou outra causa) evita autodiagnóstico e atraso.`,
      },
      {
        label: "Plano",
        body: `Tratamento, exames e hábitos orientados por ${entry.especialidade.toLowerCase()}.`,
      },
      {
        label: "Continuidade",
        body: "Prontuário e retorno na Doctor8 para não perder o fio do acompanhamento.",
      },
    ],
  };
}

function buildFaq(entry: ConditionCatalogEntry) {
  const pop = entry.nomePopular;
  const isEmergencyHeavy = EMERGENCY_SLUGS.has(entry.slug);
  return {
    title: "Perguntas frequentes",
    items: [
      {
        q: `Posso tratar ${pop.toLowerCase()} em consulta online?`,
        a: isEmergencyHeavy
          ? `Teleconsulta ajuda em orientação e seguimento, mas quadros agudos graves de ${pop.toLowerCase()} exigem pronto-socorro ou SAMU 192.`
          : `Sim, em muitos casos. O médico avalia se ${pop.toLowerCase()} pode ser conduzido por vídeo ou se pede exame presencial / encaminhamento.`,
      },
      {
        q: `Qual especialista atende ${pop.toLowerCase()}?`,
        a: `A referência costuma ser ${entry.especialidade}. O clínico geral também pode iniciar a avaliação e indicar o caminho.`,
      },
      {
        q: "A receita digital vale na farmácia?",
        a: "Quando emitida conforme as normas, sim. Você também pode buscar farmácias da rede Doctor8.",
      },
      {
        q: `O que é o CID ${entry.cid10}?`,
        a: `É o código de classificação de ${entry.nome}. O diagnóstico definitivo só o médico define após avaliar você.`,
      },
      {
        q: "Serve para emergência?",
        a: "Não. Emergências vão para o 192 ou pronto-socorro. Esta página é para consulta e acompanhamento.",
      },
    ],
  };
}

function relatedFor(entry: ConditionCatalogEntry): { label: string; href: string }[] {
  return CONDITION_CATALOG.filter(
    (c) =>
      c.categoria === entry.categoria &&
      c.slug !== entry.slug &&
      !CONDITION_RESERVED_SLUGS.has(c.slug)
  )
    .slice(0, 4)
    .map((c) => ({ label: c.nomePopular, href: `/${c.slug}` }));
}

export function buildConditionLanding(entry: ConditionCatalogEntry): ConditionLandingContent {
  const accent = getConditionAccent(entry.categoria);
  const pop = entry.nomePopular;
  const heroSrc = `/marketing/condicoes/${entry.slug}/hero.png`;

  return {
    entry,
    accent,
    meta: {
      title: `${pop}: consulta online com ${entry.especialidade} | Doctor8`,
      description: `Agende consulta sobre ${pop.toLowerCase()} (${entry.nome}). Avaliação com ${entry.especialidade.toLowerCase()}, receita digital e acompanhamento na Doctor8.`,
    },
    hero: {
      eyebrow: `${pop} · ${entry.especialidade}`,
      title: `Cuidado para ${pop.toLowerCase()} sem fila`,
      titleHighlight: "consulta online, orientação e acompanhamento",
      subtitle: `${entry.nome} (CID ${entry.cid10}) merece avaliação médica com foco em ${entry.categoria.toLowerCase()}. Agende com ${entry.especialidade.toLowerCase()} ou clínico na Doctor8.`,
      primaryCta: { label: "Agendar consulta", href: "/register" },
      secondaryCta: { label: "Falar no WhatsApp" },
      browseCta: { label: `Buscar ${entry.especialidade.toLowerCase()}`, href: "/" },
      emergencyNote: emergencyNoteFor(entry),
      image: {
        src: heroSrc,
        alt: `Ilustração de cuidado em saúde para ${pop}`,
      },
    },
    whenToBook: buildWhenToBook(entry),
    howItWorks: {
      eyebrow: "Como funciona",
      title: "Da dúvida à consulta, no mesmo ecossistema",
      subtitle: "Teleconsulta com prontuário, receita digital quando indicada e rede de apoio.",
      image: {
        src: "/marketing/condicoes/_shared/consulta.png",
        alt: "Paciente em teleconsulta Doctor8",
      },
      steps: [
        {
          step: "01",
          title: "Agende online",
          body: `Escolha horário com ${entry.especialidade.toLowerCase()} ou clínico.`,
        },
        {
          step: "02",
          title: "Consulta por vídeo",
          body: `Conte sintomas, exames e dúvidas sobre ${pop.toLowerCase()}.`,
        },
        {
          step: "03",
          title: "Plano e receita",
          body: "Orientação clara; prescrição digital quando for seguro e indicado.",
        },
        {
          step: "04",
          title: "Acompanhe",
          body: "Retorno e histórico no prontuário Doctor8.",
        },
      ],
    },
    care: {
      eyebrow: "Quem pode te atender",
      title: `Rede certa para ${pop.toLowerCase()}`,
      subtitle: `Categoria ${entry.categoria} · especialidade de referência: ${entry.especialidade}.`,
      items: buildCareItems(entry),
    },
    why: buildWhy(entry),
    faq: buildFaq(entry),
    finalCta: {
      title: `Pronto para cuidar de ${pop.toLowerCase()} com acompanhamento?`,
      subtitle: "Agende agora ou fale no WhatsApp — a gente te encaminha para o próximo passo.",
      primary: { label: "Agendar consulta", href: "/register" },
      secondary: { label: "WhatsApp Doctor8" },
      browse: { label: "Buscar especialistas", href: "/" },
    },
    related: relatedFor(entry),
  };
}

/** Prefer per-slug hero; fall back to category art in the component if file missing is handled via category path in imageFallback */
export function conditionHeroCandidates(entry: ConditionCatalogEntry): string[] {
  const cat = categoriaSlug(entry.categoria);
  return [
    `/marketing/condicoes/${entry.slug}/hero.png`,
    `/marketing/condicoes/_categorias/${cat}.png`,
    `/marketing/condicoes/_shared/hero-fallback.png`,
  ];
}

export { categoriaSlug };
