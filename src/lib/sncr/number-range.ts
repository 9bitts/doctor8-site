/** Expand SNCR RCE number range (inicio–fim) into individual receipt numbers. */
export function expandSncrNumberRange(
  inicio: string,
  fim: string,
  max = 200,
): string[] {
  if (!inicio) return [];
  if (!fim || inicio === fim) return [inicio];

  const startMatch = inicio.match(/^(.*?)(\d+)$/);
  const endMatch = fim.match(/^(.*?)(\d+)$/);
  if (!startMatch || !endMatch || startMatch[1] !== endMatch[1]) {
    return [inicio];
  }

  const prefix = startMatch[1];
  const startNum = parseInt(startMatch[2], 10);
  const endNum = parseInt(endMatch[2], 10);
  const width = startMatch[2].length;

  if (
    Number.isNaN(startNum) ||
    Number.isNaN(endNum) ||
    endNum < startNum ||
    endNum - startNum + 1 > max
  ) {
    return [inicio];
  }

  const out: string[] = [];
  for (let n = startNum; n <= endNum; n++) {
    out.push(`${prefix}${String(n).padStart(width, "0")}`);
  }
  return out;
}
