import { DEFAULT_VENEZUELA_POOLS } from "@/lib/humanitarian/constants";

/** Maps a PROFESSIONAL's specialty to the single humanitarian pool they may join. */
export function resolveProfessionalPoolSlug(specialty: string): string {
  const s = specialty.toLowerCase();
  let best: { slug: string; hintLen: number } | null = null;

  for (const pool of DEFAULT_VENEZUELA_POOLS) {
    if (!pool.volunteerRoles.includes("PROFESSIONAL") || !pool.specialtyHints) continue;
    for (const hint of pool.specialtyHints) {
      const h = hint.toLowerCase();
      if (!s.includes(h)) continue;
      if (!best || h.length > best.hintLen) {
        best = { slug: pool.slug, hintLen: h.length };
      }
    }
  }

  return best?.slug ?? "medico";
}
