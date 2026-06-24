// Common Brazilian lab abbreviations ? CBHPM codes / search terms.
// CBHPM uses formal names (e.g. "Desidrogenase l?ctica"), not everyday acronyms.

function norm(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

interface ExamAlias {
  codes?: string[];
  searchTerms?: string[];
}

const ALIASES: Record<string, ExamAlias> = {
  ldh: { codes: ["4.03.01.72-9"], searchTerms: ["desidrogenase latica"] },
  "lactato desidrogenase": { codes: ["4.03.01.72-9"], searchTerms: ["desidrogenase latica"] },
  tsh: { codes: ["4.03.16.52-1"], searchTerms: ["tireoestimulante"] },
  vhs: { codes: ["4.03.04.37-0"], searchTerms: ["hemossedimentacao"] },
  tgo: { codes: ["4.03.02.50-4"], searchTerms: ["transaminase oxalacetica"] },
  ast: { codes: ["4.03.02.50-4"], searchTerms: ["transaminase oxalacetica"] },
  tgp: { codes: ["4.03.02.51-2"], searchTerms: ["transaminase piruvica"] },
  alt: { codes: ["4.03.02.51-2"], searchTerms: ["transaminase piruvica"] },
  hba1c: { codes: ["4.03.02.73-3"], searchTerms: ["hemoglobina glicada"] },
  glicada: { codes: ["4.03.02.73-3"], searchTerms: ["hemoglobina glicada"] },
  psa: { searchTerms: ["antigeno especifico prostatico"] },
  pcr: { searchTerms: ["proteina c reativa"] },
  eas: { searchTerms: ["elementos anormais", "urina rotina", "urina tipo i"] },
  urina: { searchTerms: ["urina rotina", "urinalise"] },
  hemograma: { searchTerms: ["hemograma"] },
  ferro: { codes: ["4.03.01.84-2"], searchTerms: ["ferro serico"] },
  ferritina: { searchTerms: ["ferritina"] },
  creatinina: { searchTerms: ["creatinina"] },
  ureia: { searchTerms: ["ureia"] },
  ggt: { searchTerms: ["gama glutamil"] },
  fosfatase: { searchTerms: ["fosfatase alcalina"] },
  bilirrubina: { searchTerms: ["bilirrubina"] },
  colesterol: { searchTerms: ["colesterol total"] },
  hdl: { searchTerms: ["colesterol hdl"] },
  ldl: { searchTerms: ["colesterol ldl"] },
  triglicerides: { searchTerms: ["triglicerides"] },
  vitamina: { searchTerms: ["vitamina"] },
  vitd: { searchTerms: ["vitamina d"] },
  "vitamina d": { searchTerms: ["vitamina d", "25 hidroxi"] },
  b12: { searchTerms: ["vitamina b12", "cobalamina"] },
  acido: { searchTerms: ["acido urico"] },
  "acido urico": { searchTerms: ["acido urico"] },
  hcg: { searchTerms: ["gonadotrofina corionica"] },
};

export function resolveExamSearch(q: string): { codes: string[]; searchTerms: string[] } {
  const key = norm(q);
  const alias = ALIASES[key];
  if (alias) {
    return {
      codes: alias.codes || [],
      searchTerms: (alias.searchTerms || []).map(norm),
    };
  }
  return { codes: [], searchTerms: [key] };
}

export { norm as normalizeExamQuery };
