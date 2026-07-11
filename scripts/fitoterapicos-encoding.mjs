/** Normaliza texto extraído dos PDFs Anvisa (mojibake → UTF-8). */
export function fixEncoding(text) {
  return repairMojibake(text.replace(/\r\n/g, "\n"));
}

function repairMojibake(text) {
  return (
    text
      // Sequências compostas (UTF-8 lido como cp1252)
      .replace(/├ç├âO/gi, "ÇÃO")
      .replace(/├ç├âES/gi, "ÇÕES")
      .replace(/├ç├â/g, "ÇÃ")
      .replace(/├º├úo/gi, "ção")
      .replace(/├º├ú/gi, "çã")
      .replace(/├Áes/gi, "ões")
      .replace(/├Áo/gi, "ão")
      .replace(/├Á/g, "Ã")
      .replace(/çúo/gi, "ção")
      .replace(/ügua/g, "Água")
      .replace(/Núo/g, "Não")
      .replace(/├ç├òES/gi, "ÇÕES")
      .replace(/├ç├ò/gi, "ÇÕ")
      .replace(/├è/g, "Ê")
      .replace(/├¬/g, "ê")
      .replace(/├║/g, "ú")
      .replace(/├í/g, "á")
      .replace(/├¡/g, "í")
      .replace(/├ú/g, "ú")
      .replace(/├│/g, "ó")
      .replace(/├┤/g, "õ")
      .replace(/├ó/g, "ô")
      .replace(/├®/g, "é")
      .replace(/├á/g, "á")
      .replace(/├â/g, "ã")
      .replace(/├ê/g, "ê")
      .replace(/├è/g, "è")
      .replace(/├ì/g, "ì")
      .replace(/├º/g, "ç")
      .replace(/├ç/g, "ç")
      .replace(/├ü/g, "ü")
      .replace(/├ñ/g, "ñ")
      .replace(/├ü/g, "Ü")
      .replace(/├ë/g, "É")
      .replace(/├ë/g, "Ë")
      .replace(/├ô/g, "Ó")
      .replace(/├Ü/g, "Ú")
      .replace(/├é/g, "Â")
      .replace(/├ç/g, "Ç")
      .replace(/├ü/g, "Á")
      .replace(/ÔÇô/g, "–")
      .replace(/ÔÇö/g, "—")
      .replace(/ÔÇ£/g, "\"")
      .replace(/ÔÇØ/g, "\"")
      .replace(/ÔÇÖ/g, "'")
      .replace(/ÔÇª/g, "...")
      .replace(/╬╝/g, "μ")
      .replace(/1┬¬/g, "1ª")
      .replace(/2┬¬/g, "2ª")
      .replace(/Formul├írio/g, "Formulário")
      .replace(/Fitoter├ípico/g, "Fitoterápico")
      .replace(/Farmacopeia Brasileira/g, "Farmacopeia Brasileira")
  );
}

/** Junta quebras de linha com hifenização do PDF. */
export function unwrapParagraphs(text) {
  return text
    .replace(/(\w)-\n(\w)/g, "$1$2")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n");
}

export function normalizeSciKey(name) {
  return name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function slugFromScientific(nome) {
  return `fitoterapico-${normalizeSciKey(nome)
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")}`;
}

export function searchTextFrom(nome, nomeCientifico, alternativos = []) {
  const safeAlt = alternativos
    .map((a) => a.replace(/\s+/g, " ").trim())
    .filter(
      (a) =>
        a.length > 0 &&
        a.length <= 80 &&
        !/-- \d+ of/i.test(a) &&
        !/^(PREPARA|TINTURA|F[OÓ]RMULA|ORIENTA|ADVERT)/i.test(a),
    )
    .slice(0, 8);
  const text = [nome, nomeCientifico, ...safeAlt]
    .join(" ")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
  return text.slice(0, 480);
}
