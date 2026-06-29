// Normalized search text for PatientRecord (org/reception search on encrypted PHI).

/** Accent-insensitive lowercase token for DB search index. */
export function normalizeSearchToken(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .trim();
}

/** Builds searchText from decrypted/plain name + email. */
export function buildPatientRecordSearchText(
  firstName: string,
  lastName: string,
  email?: string | null,
): string {
  const parts = [
    normalizeSearchToken(firstName),
    normalizeSearchToken(lastName),
    email ? normalizeSearchToken(email) : "",
  ].filter(Boolean);
  return parts.join(" ");
}

/** Normalizes a user query for matching against searchText. */
export function normalizeSearchQuery(q: string): string {
  return normalizeSearchToken(q);
}
