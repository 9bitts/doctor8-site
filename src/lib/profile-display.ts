// Hide placeholder profile copy on public listings (#19).

const PLACEHOLDER_BIO_SNIPPETS = [
  "tell patients about your experience",
  "conte sobre sua experiência",
  "cuente sobre su experiencia",
  "experience and approach",
  "experiencia y enfoque",
  "experiência e abordagem",
];

const PLACEHOLDER_HEADLINE_SNIPPETS = [
  "caring for your health with dedication",
  "cuidando da sua saúde com dedicação",
  "cuidando tu salud con dedicación",
  "ex.: cuidando",
  "e.g. caring",
  "ej.: cuidando",
];

function matchesPlaceholder(text: string, snippets: string[]): boolean {
  const normalized = text.trim().toLowerCase();
  if (!normalized) return true;
  return snippets.some((s) => normalized.includes(s));
}

export function sanitizePublicBio(bio: string | null | undefined): string | null {
  if (!bio?.trim()) return null;
  if (matchesPlaceholder(bio, PLACEHOLDER_BIO_SNIPPETS)) return null;
  return bio.trim();
}

export function sanitizePublicHeadline(headline: string | null | undefined): string | null {
  if (!headline?.trim()) return null;
  if (matchesPlaceholder(headline, PLACEHOLDER_HEADLINE_SNIPPETS)) return null;
  return headline.trim();
}
