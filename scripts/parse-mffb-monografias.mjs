import { fixEncoding, normalizeSciKey, searchTextFrom, slugFromScientific, unwrapParagraphs } from "./fitoterapicos-encoding.mjs";

const MFFB_SPECIES_ORDER = [
  "Actaea racemosa L.",
  "Aesculus hippocastanum L.",
  "Allium sativum L.",
  "Aloe vera (L.) Burm.f.",
  "Calendula officinalis L.",
  "Cynara scolymus L.",
  "Echinacea purpurea (L.) Moench",
  "Equisetum arvense L.",
  "Ginkgo biloba L.",
  "Glycine max (L.) Merr.",
  "Harpagophytum procumbens DC. e Harpagophytum zeyheri Ihlenf. & H. Hartmann",
  "Hypericum perforatum L.",
  "Lippia sidoides Cham.",
  "Matricaria chamomilla L.",
  "Maytenus ilicifolia Mart.ex Reissek e Maytenus aquifolia Mart.",
  "Passiflora incarnata L.",
  "Paullinia cupana Kunth",
  "Peumus boldus Molina",
  "Piper methysticum G. Forst",
  "Psidium guajava L.",
  "Rhamnus purshiana DC.",
  "Senna alexandrina Mill.",
  "Serenoa repens (W. Bartram) Small",
  "Stryphnodendron adstringens (Mart.) Coville",
  "Trifolium pratense L.",
  "Uncaria tomentosa (Willd. DC.)",
  "Valeriana officinalis L.",
  "Zingiber officinale Roscoe",
];

const MFFB_LOTE1 = new Set([
  "actaea racemosa l.",
  "aesculus hippocastanum l.",
  "allium sativum l.",
  "aloe vera (l.) burm.f.",
  "calendula officinalis l.",
  "cynara scolymus l.",
  "echinacea purpurea (l.) moench",
  "equisetum arvense l.",
]);

/** Espécies MFFB presentes na RENISUS — inferência por nome científico; revisar em produção. */
const RENISUS_MFFB_KEYS = new Set([
  "aloe vera (l.) burm.f.",
  "cynara scolymus l.",
  "glycine max (l.) merr.",
  "lippia sidoides cham.",
  "maytenus ilicifolia mart.ex reissek e maytenus aquifolia mart.",
  "passiflora incarnata l.",
  "paullinia cupana kunth",
  "peumus boldus molina",
  "psidium guajava l.",
  "rhamnus purshiana dc.",
  "senna alexandrina mill.",
  "stryphnodendron adstringens (mart.) coville",
  "uncaria tomentosa (willd. dc.)",
  "valeriana officinalis l.",
  "zingiber officinale roscoe",
  "matricaria chamomilla l.",
  "echinacea purpurea (l.) moench",
]);

const SECTION_MARKERS = [
  { key: "identificacao", pattern: /^IDENTIFICA.{1,8}O/im },
  { key: "indicacoes", pattern: /^INDICA.{1,8}ES\s+TERAP.{1,8}UTICAS/im },
  { key: "contraindicacoes", pattern: /^CONTRAINDICA.{1,8}ES/im },
  { key: "precaucoes", pattern: /^PRECAU.{1,8}ES DE USO/im },
  { key: "efeitosAdversos", pattern: /^EFEITOS ADVERSOS/im },
  { key: "interacoes", pattern: /^INTERA.{1,8}ES MEDICAMENTOSAS/im },
  { key: "formasFarmaceuticas", pattern: /^FORMAS FARMAC.{1,8}UTICAS/im },
  { key: "posologia", pattern: /^VIAS DE ADMINISTRA.{1,8}O E POSOLOGIA/im },
  { key: "tempoUtilizacao", pattern: /^TEMPO DE UTILIZA.{1,8}O/im },
  { key: "superdosagem", pattern: /^SUPERDOSAGEM/im },
  { key: "prescricao", pattern: /^PRESCRI.{1,8}O/im },
  { key: "classesQuimicas", pattern: /^PRINCIPAIS CLASSES QU.{1,8}MICAS/im },
  { key: "referencias", pattern: /^REFER.{1,8}NCIAS/im },
];

function extractBetween(text, startPattern, endPattern) {
  const start = text.search(startPattern);
  if (start === -1) return "";
  const slice = text.slice(start);
  const headerEnd = slice.search(/\n/);
  const content = headerEnd === -1 ? slice : slice.slice(headerEnd + 1);
  const end = content.search(endPattern);
  return (end === -1 ? content : content.slice(0, end)).trim();
}

function fieldAfterLabel(block, label) {
  const re = new RegExp(`^${label}\\s*\\n([\\s\\S]*?)(?=\\n[A-Za-zÀ-ú].+:|\\n[A-ZÁÉÍÓÚÂÊÔÃÕÇ][A-ZÁÉÍÓÚÂÊÔÃÕÇ ]{3,}|$)`, "im");
  const m = block.match(re);
  if (!m) {
    const simple = new RegExp(`^${label}\\s*\\n([\\s\\S]*)`, "im");
    const s = block.match(simple);
    return s ? s[1].trim().split("\n")[0].trim() : "";
  }
  return m[1].trim().replace(/\s*\(\d+\)\s*$/, "").trim();
}

function parseIdentificacao(block) {
  const familia = fieldAfterLabel(block, "Família") || fieldAfterLabel(block, "Familia");
  const sinonimia = fieldAfterLabel(block, "Sinonímia") || fieldAfterLabel(block, "Sinonimia");
  const popular = fieldAfterLabel(block, "Nomenclatura popular");
  const parte = fieldAfterLabel(block, "Parte utilizada/órgão vegetal")
    || fieldAfterLabel(block, "Parte utilizada/ órgão vegetal")
    || fieldAfterLabel(block, "Parte utilizada/orgao vegetal")
    || (block.match(/Parte utilizada[^\n]*\n([^\n]+)/i)?.[1] ?? "");

  const alternativos = [];
  if (popular) alternativos.push(...popular.split(/[,;]/).map((s) => s.trim()).filter(Boolean));
  if (sinonimia) alternativos.push(sinonimia.replace(/\.\(\d+\)$/, "").trim());

  return { familia, parte, alternativos };
}

function parseFormasFarmaceuticas(text) {
  if (!text) return [];
  const items = [];
  const lower = text.toLowerCase();
  const map = [
    ["cápsula", "cápsulas"],
    ["capsula", "cápsulas"],
    ["comprimido", "comprimidos"],
    ["tintura", "tintura"],
    ["gel", "gel"],
    ["pomada", "pomada"],
    ["creme", "creme"],
    ["infusão", "infusão"],
    ["infusao", "infusão"],
    ["chá", "chá medicinal (infusão)"],
    ["cha ", "chá medicinal (infusão)"],
    ["extrato", "extrato"],
    ["solução", "solução oral"],
    ["solucao", "solução oral"],
  ];
  for (const [needle, label] of map) {
    if (lower.includes(needle) && !items.includes(label)) items.push(label);
  }
  return items;
}

function parseViaAdministracao(posologiaText, formas) {
  const t = (posologiaText || "").toLowerCase();
  const vias = [];
  if (/\boral\b|via oral|administração oral|administracao oral|comprimido|cápsula|capsula|tintura|extrato|chá|cha /.test(t)) vias.push("oral");
  if (/\btópica\b|\btopica\b|uso externo|aplicar|gel|pomada|creme|compressa/.test(t)) vias.push("tópica");
  if (vias.length === 0 && formas.some((f) => /gel|pomada|creme/.test(f))) vias.push("tópica");
  if (vias.length === 0) vias.push("oral");
  return [...new Set(vias)];
}

function prescricaoObrigatoria(text) {
  const t = (text || "").toLowerCase();
  if (/n[aã]o.*prescri/.test(t) && /somente sob|somente com|apenas com/.test(t)) return true;
  if (/somente sob prescri/.test(t) || /somente com prescri/.test(t)) return true;
  if (/n[aã]o necessita.*prescri/.test(t) || /sem prescri/.test(t) && /n[aã]o/.test(t)) return false;
  if (/prescri[cç][aã]o m[eé]dica/.test(t)) return true;
  return false;
}

function alertaGestacaoPediatria(contra, prec, pos) {
  const blob = `${contra}\n${prec}\n${pos}`.toLowerCase();
  const parts = [];
  if (/contraindicad[oa].*gravidez|gravidez.*contraindicad|gesta[cç][aã]o.*contraindicad|n[aã]o.*gravidez|n[aã]o.*gesta/.test(blob)) {
    parts.push("Contraindicado na gravidez.");
  }
  if (/lacta[cç][aã]o|lactantes|amamenta[cç][aã]o/.test(blob) && /contraindicad|n[aã]o.*usar|n[aã]o se recomenda/.test(blob)) {
    parts.push("Contraindicado ou não recomendado na lactação.");
  }
  if (/menores de \d+|crian[cç]as|pediatr|adolescentes/.test(blob) && /contraindicad|n[aã]o.*usar|sem supervis[aã]o/.test(blob)) {
    const m = blob.match(/menores de \d+[^.;\n]*/);
    parts.push(m ? m[0].trim().charAt(0).toUpperCase() + m[0].trim().slice(1) + "." : "Restrições de uso em crianças/adolescentes — ver contraindicações.");
  }
  return parts.length ? parts.join(" ") : null;
}

function parseMonographBody(body) {
  const sections = {};
  for (let i = 0; i < SECTION_MARKERS.length; i++) {
    const { key, pattern } = SECTION_MARKERS[i];
    const next = SECTION_MARKERS[i + 1]?.pattern ?? /^REFER[EÊ]NCIAS/m;
    sections[key] = extractBetween(body, pattern, next).replace(pattern, "").trim();
  }

  const id = parseIdentificacao(sections.identificacao || body);
  const formas = parseFormasFarmaceuticas(sections.formasFarmaceuticas);
  const posologia = [sections.posologia, sections.formasFarmaceuticas ? "" : ""]
    .filter(Boolean)
    .join("\n")
    .trim() || sections.posologia;

  const interacoes = sections.interacoes?.trim();
  const interacoesVal =
    !interacoes || /n[aã]o foram encontrados dados/i.test(interacoes) ? null : interacoes;

  return {
    indicacoes: sections.indicacoes || "",
    contraindicacoes: sections.contraindicacoes || "",
    precaucoes: sections.precaucoes || "",
    interacoesMedicamentosas: interacoesVal,
    posologia: posologia || "",
    viaAdministracao: parseViaAdministracao(posologia, formas),
    detalhesEspecificos: {
      familiaBotanica: id.familia.replace(/\.\(\d+\)$/, "").trim(),
      parteUsada: id.parte.replace(/\.\(\d+\)$/, "").trim(),
      formaFarmaceutica: formas,
      efeitosAdversos: sections.efeitosAdversos || "",
      tempoUtilizacao: sections.tempoUtilizacao || "",
      superdosagem: sections.superdosagem || "",
      prescricaoObrigatoria: prescricaoObrigatoria(sections.prescricao),
      principaisClassesQuimicas: (sections.classesQuimicas || "").replace(/\.\(\d+\)$/, "").trim(),
    },
    alertaGestacaoPediatria: alertaGestacaoPediatria(
      sections.contraindicacoes,
      sections.precaucoes,
      sections.posologia,
    ),
    nomesAlternativos: id.alternativos,
  };
}

function findMonographStart(text, canonicalName) {
  const genus = canonicalName.split(/[ (]/)[0];
  const epithet = (canonicalName.split(/[ (]/)[1] ?? "").replace(/\.$/, "");

  const candidates = [canonicalName];
  if (epithet) {
    candidates.push(`${genus} ${epithet}`);
    candidates.push(`${genus} ${epithet}.`);
    candidates.push(`${genus} ${epithet} L.`);
  }

  for (const name of candidates) {
    const escaped = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/\s+/g, "\\s+");
    const re = new RegExp(`\\n(${escaped}[^\\n]{0,100})\\s*\\n`, "i");
    const m = re.exec(text);
    if (!m) continue;
    if (/\.{5,}/.test(m[1]) || /-- \d+ of/i.test(m[1])) continue;
    const window = text.slice(m.index, m.index + 900);
    if (/IDENTIFICA/i.test(window)) return m.index + 1;
  }

  // Fallback: linha com gênero + epíteto, depois SINONIMIA opcional, depois IDENTIFICAÇÃO
  if (epithet) {
    const re = new RegExp(
      `\\n(${genus}\\s+${epithet}[^\\n]{0,80})\\s*\\n(?:SIN[OÔoó]N[IÌií]MIA[^\\n]*\\n)?IDENTIFICA`,
      "i",
    );
    const m = re.exec(text);
    if (m && !/\.{5,}/.test(m[1])) return m.index + 1;
  }

  return -1;
}

export function splitMffbMonographs(rawText) {
  const text = unwrapParagraphs(fixEncoding(rawText));
  const starts = [];
  for (const species of MFFB_SPECIES_ORDER) {
    const idx = findMonographStart(text, species);
    if (idx >= 0) starts.push({ species, idx, key: normalizeSciKey(species) });
  }
  starts.sort((a, b) => a.idx - b.idx);

  const chunks = [];
  for (let i = 0; i < starts.length; i++) {
    const end = starts[i + 1]?.idx ?? text.length;
    chunks.push({
      canonicalName: starts[i].species,
      key: starts[i].key,
      body: text.slice(starts[i].idx, end),
    });
  }
  return chunks;
}

export function mffbToLoteItem(chunk, dataConsulta = "2026-07-11") {
  const headerMatch = chunk.body.match(/^([^\n]+)\n/);
  const nome = headerMatch ? headerMatch[1].trim() : chunk.canonicalName;
  const nomeCientifico = chunk.canonicalName;
  const parsed = parseMonographBody(chunk.body);

  return {
    slug: slugFromScientific(nomeCientifico),
    nome,
    nomesAlternativos: parsed.nomesAlternativos,
    nomeCientifico,
    categoriaPratica: "FITOTERAPICO",
    indicacoes: parsed.indicacoes,
    contraindicacoes: parsed.contraindicacoes,
    precaucoes: parsed.precaucoes,
    interacoesMedicamentosas: parsed.interacoesMedicamentosas,
    posologia: parsed.posologia,
    viaAdministracao: parsed.viaAdministracao,
    statusRegulatorio: "MEDICAMENTO_REGISTRADO",
    fontes: [
      {
        fonte: "MFFB",
        edicao: "1ª ed. 2016",
        url: "https://www.gov.br/anvisa/en/pharmacopeia/arquivos/memento-fitoterapico.pdf",
        dataConsulta,
      },
    ],
    alertaGestacaoPediatria: parsed.alertaGestacaoPediatria,
    renisus: RENISUS_MFFB_KEYS.has(normalizeSciKey(nomeCientifico)),
    detalhesEspecificos: parsed.detalhesEspecificos,
    searchText: searchTextFrom(nome, nomeCientifico, parsed.nomesAlternativos),
  };
}

export function generateMffbLote2(rawText) {
  const chunks = splitMffbMonographs(rawText)
    .filter((c) => !MFFB_LOTE1.has(c.key))
    .sort((a, b) => {
      const ia = MFFB_SPECIES_ORDER.findIndex((s) => normalizeSciKey(s) === a.key);
      const ib = MFFB_SPECIES_ORDER.findIndex((s) => normalizeSciKey(s) === b.key);
      return ia - ib;
    });
  return chunks.map((c) => mffbToLoteItem(c));
}

export { MFFB_SPECIES_ORDER, MFFB_LOTE1, RENISUS_MFFB_KEYS };
