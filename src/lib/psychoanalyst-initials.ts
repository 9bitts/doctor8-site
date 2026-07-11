/** Safe avatar initials — returns "?" when names are empty. */
export function initials(first: string, last: string): string {
  const f = first.trim()[0] ?? "";
  const l = last.trim()[0] ?? "";
  const result = (f + l).toUpperCase();
  return result || "?";
}
