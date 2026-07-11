/** Uppercase initials from first/last name, with "?" fallback when empty. */
export function initialsOf(first: string, last: string): string {
  const f = first.trim();
  const l = last.trim();
  const fi = f.charAt(0).toUpperCase();
  const li = l.charAt(0).toUpperCase();
  if (fi && li) return `${fi}${li}`;
  if (fi) return fi;
  if (li) return li;
  return "?";
}
