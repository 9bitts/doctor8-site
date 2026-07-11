import { fixEncoding, normalizeSciKey, searchTextFrom, slugFromScientific, unwrapParagraphs } from "./fitoterapicos-encoding.mjs";
import { MFFB_SPECIES_ORDER } from "./parse-mffb-monografias.mjs";

/** Chaves MFFB para detectar overlap (merge via seed legacy). */
export const MFFB_KEYS = new Set(MFFB_SPECIES_ORDER.map((s) => normalizeSciKey(s)));

const FFFB_SECTION_MARKERS = [
  { key: "popular", pattern: /^NOMENCLATURA POPULAR/im },
  { key: "preparacao", pattern: /^(?:PREPARA.{1,8}O EXTEMPOR.{1,8}NEA|TINTURA|C[ÜU]PSULA|GEL|CREME)/im },
  { key: "orientacoes", pattern: /^ORIENTA.{1,8}OES PARA O PREPARO/im },
  { key: "embalagem", pattern: /^EMBALAGEM E ARMAZENAMENTO/im },
  { key: "advertencias", pattern: /^ADVERT.{1,8}NCIAS/im },
  { key: "indicacoes", pattern: /^INDICA.{1,12}(?:\s|$)/im },
  { key: "modoUsar", pattern: /^MODO DE USAR/im },
  { key: "referencias", pattern: /^REFER.{1,8}NCIAS/im },
];

const FFFB_AFTER_TITLE =
  /(?:SINON|NOMENCLATURA POPULAR|PREPARA|TINTURA|C[ÜU]PSULA|GEL|CREME|ADVERT)/im;

const FFFB_SECTION_UNTIL = [
  /^(?:PREPARA|TINTURA|C[ÜU]PSULA|GEL|CREME|ORIENTA|EMBALAGEM|ADVERT|MODO)/im,
  /^(?:ORIENTA|EMBALAGEM|ADVERT|INDICA|MODO)/im,
  /^(?:EMBALAGEM|ADVERT|INDICA|MODO)/im,
  /^(?:ADVERT|INDICA|MODO)/im,
  /^(?:INDICA|MODO)/im,
  /^MODO/im,
  /^REFER/im,
  /^REFER/im,
];

function extractSection(text, pattern, nextPattern) {
  const start = text.search(pattern);
  if (start === -1) return "";
  const slice = text.slice(start);
  const headerEnd = slice.search(/\n/);
  const content = headerEnd === -1 ? slice : slice.slice(headerEnd + 1);
  const end = content.search(nextPattern);
  return (end === -1 ? content : content.slice(0, end)).trim();
}

function parseFffbBody(body) {
  const sections = {};
  for (let i = 0; i < FFFB_SECTION_MARKERS.length; i++) {
    const { key, pattern } = FFFB_SECTION_MARKERS[i];
    const until = FFFB_SECTION_UNTIL[i] ?? /^REFER/im;
    sections[key] = extractSection(body, pattern, until);
  }
  return sections;
}

function parsePopularNames(text) {
  if (!text) return [];
  const names = [];
  for (const line of text.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    if (/^(PREPARA|TINTURA|C[ÜU]PSULA|GEL|CREME|ORIENTA|EMBALAGEM|ADVERT|MODO|F[OÓ]RMULA|Componentes|-- \d+ of)/i.test(trimmed)) {
      break;
    }
    if (trimmed.length > 120) break;
    for (const part of trimmed.split(/[,;]/)) {
      const name = part.trim();
      if (name.length > 1 && name.length <= 80) names.push(name);
    }
  }
  return [...new Set(names)].slice(0, 10);
}

function parseFormasFromPreparacao(text) {
  const formas = [];
  const t = (text || "").toLowerCase();
  if (/infus[aã]o|infuso|ch[aá]/.test(t)) formas.push("infusão");
  if (/deco[cç][aã]o/.test(t)) formas.push("decoção");
  if (/tintura/.test(t)) formas.push("tintura");
  if (/xarope/.test(t)) formas.push("xarope");
  if (/c[aá]psula/.test(t)) formas.push("cápsulas");
  if (/comprimido/.test(t)) formas.push("comprimidos");
  if (/gel|pomada|creme/.test(t)) formas.push("uso tópico");
  if (formas.length === 0 && /prepara[cç][aã]o extempor/.test(t)) formas.push("preparação extemporânea");
  return formas;
}

function parseViaFromModo(text) {
  const t = (text || "").toLowerCase();
  const vias = [];
  if (/uso oral|tomar|ingerir|via oral/.test(t)) vias.push("oral");
  if (/uso externo|aplicar|compressa|t[oó]pica/.test(t)) vias.push("tópica");
  if (vias.length === 0) vias.push("oral");
  return [...new Set(vias)];
}

function alertaGestacaoPediatria(advertencias, modoUsar) {
  const blob = `${advertencias}\n${modoUsar}`.toLowerCase();
  const parts = [];
  if (/contraindicad[oa].*gesta|gesta[cç][aã]o|gravidez/.test(blob)) {
    parts.push("Contraindicado na gravidez.");
  }
  if (/lacta[cç][aã]o|lactantes|amamenta[cç][aã]o/.test(blob) && /contraindicad|n[aã]o/.test(blob)) {
    parts.push("Contraindicado ou não recomendado na lactação.");
  }
  if (/menores de \d+|crian[cç]as|pedi[aá]trico/.test(blob) && /contraindicad|n[aã]o|acima de/.test(blob)) {
    const m = blob.match(/menores de \d+[^.;\n]*/);
    parts.push(
      m
        ? m[0].trim().charAt(0).toUpperCase() + m[0].trim().slice(1) + "."
        : "Restrições de uso pediátrico — ver advertências.",
    );
  }
  return parts.length ? parts.join(" ") : null;
}

/** Extrai títulos de monografias do sumário FFFB. */
export function extractFffbSpeciesFromToc(rawText) {
  const text = fixEncoding(rawText);
  const tocStart = text.search(/4\s+MONOGRAFIAS/i);
  const tocEnd = text.search(/1\s+HIST[OÓ]RICO/i);
  if (tocStart < 0) return [];

  const slice = text.slice(tocStart, tocEnd > tocStart ? tocEnd : tocStart + 12000);
  const species = [];
  let pending = "";

  for (const line of slice.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || /^4\s+MONOGRAFIAS/i.test(trimmed)) continue;
    if (/^-- \d+ of/i.test(trimmed) || /^[ivx]+\s+Formul/i.test(trimmed)) continue;

    const dotted = trimmed.match(/^(.+?)\s*\.{3,}\s*\d+\s*$/);
    if (dotted) {
      const full = pending
        ? `${pending} ${dotted[1]}`.replace(/\s+/g, " ").trim()
        : dotted[1].trim();
      if (/^[A-Z]/.test(full) && full.length > 8 && full.length < 400) {
        species.push(full);
      }
      pending = "";
      continue;
    }

    if (/^[A-Z]/.test(trimmed) && trimmed.length > 3 && !trimmed.includes("....")) {
      pending = pending ? `${pending} ${trimmed}`.replace(/\s+/g, " ").trim() : trimmed;
    }
  }

  return [...new Set(species)];
}

function escapeRegex(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function titleSearchKey(title) {
  return title.split(";")[0].trim().replace(/\s*\([^)]+\)\s*$/, "");
}

function findFffbMonographStart(text, title) {
  const searchTitle = titleSearchKey(title);
  const genus = searchTitle.split(/[ (;]/)[0];
  const epithet = (searchTitle.split(/[ (;]/)[1] ?? "").replace(/\.$/, "");

  const afterBlock = `[\\s\\S]{0,1200}?${FFFB_AFTER_TITLE.source}`;

  if (epithet) {
    const re = new RegExp(
      `\\n(${escapeRegex(genus)}\\s+${escapeRegex(epithet)}[^\\n]{0,120})${afterBlock}`,
      "i",
    );
    const m = re.exec(text);
    if (m && !/\.{5,}/.test(m[1])) return m.index + 1;
  }

  const titleRe = new RegExp(
    `\\n(${escapeRegex(searchTitle)}[^\\n]{0,200})${afterBlock}`,
    "i",
  );
  const direct = titleRe.exec(text);
  if (direct && !/\.{5,}/.test(direct[1])) return direct.index + 1;

  const titleKey = normalizeSciKey(searchTitle);
  const re = /\n([A-Z][^\n]{5,220})\n[\s\S]{0,1200}?(?:SINON|NOMENCLATURA POPULAR|PREPARA|ADVERT|GEL|TINTURA|C[ÜU]PSULA|CREME)/gi;
  for (const m of text.matchAll(re)) {
    const line = m[1].trim();
    if (/Formul[aá]rio|MONOGRAFIAS|SUM[AÁ]RIO/i.test(line)) continue;
    if (/\.{5,}/.test(line)) continue;
    const lineKey = normalizeSciKey(line.replace(/\s*\([^)]+\)\s*$/, ""));
    if (lineKey === titleKey || lineKey.startsWith(titleKey) || titleKey.startsWith(lineKey)) {
      return m.index + 1;
    }
  }
  return -1;
}

export function splitFffbMonographs(rawText, speciesList) {
  const text = unwrapParagraphs(fixEncoding(rawText));
  const monographsStart = text.search(/\nAchillea millefolium L\.\s*\nNOMENCLATURA POPULAR/i);
  const body = monographsStart >= 0 ? text.slice(monographsStart) : text;

  const starts = [];
  for (const title of speciesList) {
    const idx = findFffbMonographStart(body, title);
    if (idx >= 0) {
      starts.push({ title, idx, key: normalizeSciKey(title) });
    }
  }
  starts.sort((a, b) => a.idx - b.idx);

  const chunks = [];
  for (let i = 0; i < starts.length; i++) {
    const end = starts[i + 1]?.idx ?? body.length;
    chunks.push({
      title: starts[i].title,
      key: starts[i].key,
      body: body.slice(starts[i].idx, end),
    });
  }
  return chunks;
}

export function fffbToLoteItem(chunk, dataConsulta = "2026-07-11") {
  const headerMatch = chunk.body.match(/^([^\n]+)\n/);
  const nomeCientifico = headerMatch ? headerMatch[1].trim() : chunk.title;
  const nome = nomeCientifico.replace(/\s*\([^)]+\)\s*$/, "").trim();
  const parsed = parseFffbBody(chunk.body);

  const popular = parsePopularNames(parsed.popular);
  const modoPreparo = [
    parsed.preparacao,
    parsed.orientacoes,
    parsed.embalagem,
  ]
    .filter(Boolean)
    .join("\n\n")
    .trim();

  const formas = parseFormasFromPreparacao(parsed.preparacao);
  const posologia = parsed.modoUsar || parsed.indicacoes || "";
  const advertencias = parsed.advertencias || "";

  return {
    slug: slugFromScientific(nomeCientifico),
    nome,
    nomesAlternativos: popular,
    nomeCientifico,
    categoriaPratica: "FITOTERAPICO",
    indicacoes: parsed.indicacoes || "",
    contraindicacoes: advertencias,
    precaucoes: "",
    interacoesMedicamentosas: null,
    posologia,
    viaAdministracao: parseViaFromModo(posologia),
    statusRegulatorio: "PRODUTO_TRADICIONAL_NOTIFICADO",
    fontes: [
      {
        fonte: "FFFB",
        edicao: "2ª ed. 2021",
        url: "https://www.gov.br/anvisa/pt-br/assuntos/farmacopeia/farmacopeia-brasileira",
        dataConsulta,
        campos: ["modoPreparo", "indicacoes", "advertencias"],
      },
    ],
    alertaGestacaoPediatria: alertaGestacaoPediatria(advertencias, posologia),
    renisus: false,
    detalhesEspecificos: {
      modoPreparo,
      formaFarmaceutica: formas,
      preparacaoExtemporanea: Boolean(parsed.preparacao),
    },
    searchText: searchTextFrom(nome, nomeCientifico, popular),
  };
}

function mapFormaFarmaceuticaLegacy(formas) {
  if (!formas?.length) return undefined;
  const t = formas.join(" ").toLowerCase();
  if (/tintura/.test(t)) return "tintura";
  if (/c[aá]psula/.test(t)) return "capsula";
  if (/comprimido/.test(t)) return "comprimido";
  if (/deco[cç]/.test(t)) return "decoção";
  if (/infus|ch[aá]/.test(t)) return "cha";
  return "planta_in_natura";
}
export function fffbToLegacyItem(chunk) {
  const lote = fffbToLoteItem(chunk);
  return {
    nomeCientifico: lote.nomeCientifico,
    nomePopular: lote.nome,
    nomesAlternativos: lote.nomesAlternativos,
    indicacoes: lote.indicacoes,
    advertencias: lote.contraindicacoes,
    modoPreparo: lote.detalhesEspecificos.modoPreparo,
    formaFarmaceutica: mapFormaFarmaceuticaLegacy(lote.detalhesEspecificos.formaFarmaceutica),
    posologia: lote.posologia,
  };
}

export function isMffbOverlap(nomeCientifico) {
  const key = normalizeSciKey(nomeCientifico.replace(/\s*\([^)]+\)\s*$/, ""));
  for (const mffb of MFFB_KEYS) {
    if (key.startsWith(mffb.split(" ")[0] + " ") || mffb.startsWith(key.split(" ")[0] + " ")) {
      const keyGenus = key.split(" ")[0];
      const mffbGenus = mffb.split(" ")[0];
      if (keyGenus === mffbGenus) {
        const keySpecies = key.split(" ")[1]?.replace(/\(.*/, "");
        const mffbSpecies = mffb.split(" ")[1]?.replace(/\(.*/, "");
        if (!keySpecies || !mffbSpecies || key.includes(mffbSpecies) || mffb.includes(keySpecies)) {
          return true;
        }
      }
    }
  }
  return MFFB_KEYS.has(key);
}
