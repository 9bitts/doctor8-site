// Dynamic specialty & health-plan catalogs for public search (from verified provider data).

import { db } from "@/lib/db";
import type { Lang } from "@/lib/i18n/translations";
import { translate } from "@/lib/i18n/translations";
import { canonicalProfessionValue, getProfessionLabel } from "@/lib/professions";
import { picBySlug, picLabel, PICS_PRACTICES } from "@/lib/pics/practices";
import {
  INTEGRATIVE_SEO_SLUG,
  cityToSeoSlug,
  isIntegrativeSearchSlug,
  seoSlugToSpecialtyLabel,
  specialtyToSeoSlug,
} from "@/lib/public-slugs";
import { dedupeHealthPlanList, fixHealthPlanDisplayName } from "@/lib/health-plan-display";

export type PublicProviderKind = "health" | "psychoanalyst" | "integrative";

export type PublicSpecialtyItem = {
  slug: string;
  label: string;
  count: number;
  providerTypes: PublicProviderKind[];
  group?: "medical" | "mental" | "integrative" | "other";
};

type SlugAccumulator = {
  count: number;
  providerTypes: Set<PublicProviderKind>;
};

function normalizeSearchText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function slugGroup(slug: string): PublicSpecialtyItem["group"] {
  if (slug === "psicanalista" || slug === "psicologo" || slug === "psiquiatra") return "mental";
  if (isIntegrativeSearchSlug(slug)) return "integrative";
  if (
    ["nutricionista", "fisioterapeuta", "dentista", "enfermeiro"].includes(slug)
  ) {
    return "other";
  }
  return "medical";
}

function bump(
  map: Map<string, SlugAccumulator>,
  slug: string,
  kind: PublicProviderKind,
  n = 1,
) {
  if (!slug) return;
  const cur = map.get(slug) ?? { count: 0, providerTypes: new Set<PublicProviderKind>() };
  cur.count += n;
  cur.providerTypes.add(kind);
  map.set(slug, cur);
}

/** All searchable specialties from verified providers (includes non-public profiles). */
export async function listPublicSpecialties(lang: Lang = "pt"): Promise<PublicSpecialtyItem[]> {
  const map = new Map<string, SlugAccumulator>();

  const [professionals, psychoanalysts, integrativeTherapists] = await Promise.all([
    db.professionalProfile.findMany({
      where: { verified: true },
      select: { specialty: true },
    }),
    db.psychoanalystProfile.findMany({
      where: { verified: true },
      select: { id: true },
    }),
    db.integrativeTherapistProfile.findMany({
      where: { verified: true },
      select: { picsPractices: true },
    }),
  ]);

  for (const p of professionals) {
    const canonical = canonicalProfessionValue(p.specialty) ?? p.specialty;
    bump(map, specialtyToSeoSlug(canonical), "health");
  }

  for (const _ of psychoanalysts) {
    bump(map, "psicanalista", "psychoanalyst");
  }

  for (const t of integrativeTherapists) {
    bump(map, INTEGRATIVE_SEO_SLUG, "integrative");
    for (const picSlug of t.picsPractices) {
      if (picBySlug(picSlug)) bump(map, picSlug, "integrative");
    }
  }

  const items: PublicSpecialtyItem[] = [...map.entries()]
    .map(([slug, acc]) => ({
      slug,
      label: seoSlugToSpecialtyLabel(slug, lang),
      count: acc.count,
      providerTypes: [...acc.providerTypes],
      group: slugGroup(slug),
    }))
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, lang === "en" ? "en" : "pt");
    });

  return items;
}

export type PublicCityItem = {
  slug: string;
  label: string;
  count: number;
};

type CityBucket = {
  labelVotes: Map<string, number>;
  providers: Set<string>;
};

/** Cities and regions from verified providers (clinic + practice locations). */
export async function listPublicCities(lang: Lang = "pt"): Promise<PublicCityItem[]> {
  const buckets = new Map<string, CityBucket>();
  const providerHasCity = new Set<string>();

  function add(providerKey: string, city: string | null | undefined) {
    const trimmed = city?.trim();
    if (!trimmed) return;
    const slug = cityToSeoSlug(trimmed);
    if (!slug || slug === "online") return;

    providerHasCity.add(providerKey);

    let bucket = buckets.get(slug);
    if (!bucket) {
      bucket = { labelVotes: new Map(), providers: new Set() };
      buckets.set(slug, bucket);
    }
    bucket.providers.add(providerKey);
    bucket.labelVotes.set(trimmed, (bucket.labelVotes.get(trimmed) || 0) + 1);
  }

  const [professionals, psychoanalysts, integrative, locations] = await Promise.all([
    db.professionalProfile.findMany({
      where: { verified: true },
      select: { id: true, clinicCity: true, acceptsTeleconsult: true },
    }),
    db.psychoanalystProfile.findMany({
      where: { verified: true },
      select: { id: true, clinicCity: true, acceptsTeleconsult: true },
    }),
    db.integrativeTherapistProfile.findMany({
      where: { verified: true },
      select: { id: true, clinicCity: true, acceptsTeleconsult: true },
    }),
    db.practiceLocation.findMany({
      where: {
        OR: [
          { professional: { verified: true } },
          { psychoanalyst: { verified: true } },
          { integrativeTherapist: { verified: true } },
        ],
      },
      select: {
        city: true,
        professionalId: true,
        psychoanalystId: true,
        integrativeTherapistId: true,
      },
    }),
  ]);

  for (const p of professionals) {
    add(`h:${p.id}`, p.clinicCity);
  }
  for (const p of psychoanalysts) {
    add(`p:${p.id}`, p.clinicCity);
  }
  for (const p of integrative) {
    add(`i:${p.id}`, p.clinicCity);
  }
  for (const loc of locations) {
    const key = loc.professionalId
      ? `h:${loc.professionalId}`
      : loc.psychoanalystId
        ? `p:${loc.psychoanalystId}`
        : loc.integrativeTherapistId
          ? `i:${loc.integrativeTherapistId}`
          : null;
    if (key) add(key, loc.city);
  }

  const onlineProviders = new Set<string>();
  for (const p of professionals) {
    const key = `h:${p.id}`;
    if (!providerHasCity.has(key) && p.acceptsTeleconsult) onlineProviders.add(key);
  }
  for (const p of psychoanalysts) {
    const key = `p:${p.id}`;
    if (!providerHasCity.has(key) && p.acceptsTeleconsult) onlineProviders.add(key);
  }
  for (const p of integrative) {
    const key = `i:${p.id}`;
    if (!providerHasCity.has(key) && p.acceptsTeleconsult) onlineProviders.add(key);
  }

  const items: PublicCityItem[] = [...buckets.entries()]
    .map(([slug, bucket]) => {
      const label = [...bucket.labelVotes.entries()].sort((a, b) => b[1] - a[1])[0][0];
      return { slug, label, count: bucket.providers.size };
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.label.localeCompare(b.label, lang === "en" ? "en" : "pt");
    });

  if (onlineProviders.size > 0) {
    items.unshift({
      slug: "online",
      label: translate(lang, "pubSearch.cityOnline"),
      count: onlineProviders.size,
    });
  }

  return items;
}

/** Compact catalog for AI / symptom matching. */
export async function buildSpecialtyCatalogForAi(lang: Lang = "pt"): Promise<
  { slug: string; label: string; keywords: string[] }[]
> {
  const specialties = await listPublicSpecialties(lang);
  const items = specialties.map((s) => {
    const keywords: string[] = [s.label, s.slug.replace(/-/g, " ")];
    const pic = picBySlug(s.slug);
    if (pic) {
      keywords.push(pic.labelPt, pic.labelEn, pic.descriptionPt.slice(0, 120));
    } else {
      const en = seoSlugToSpecialtyLabel(s.slug, "en");
      const es = seoSlugToSpecialtyLabel(s.slug, "es");
      if (en !== s.label) keywords.push(en);
      if (es !== s.label) keywords.push(es);
    }
    return { slug: s.slug, label: s.label, keywords: [...new Set(keywords.filter(Boolean))] };
  });

  // Ensure PICS with zero providers still appear if any integrative exists
  if (specialties.some((s) => s.providerTypes.includes("integrative"))) {
    for (const pic of PICS_PRACTICES) {
      if (!items.some((i) => i.slug === pic.slug)) {
        items.push({
          slug: pic.slug,
          label: picLabel(pic, lang),
          keywords: [pic.labelPt, pic.labelEn, pic.descriptionPt.slice(0, 80)],
        });
      }
    }
  }

  return items;
}

/** Health plans linked to at least one verified provider. */
export async function listUsedHealthPlans() {
  const [proLinks, psychoLinks, integrativeLinks] = await Promise.all([
    db.professionalHealthPlan.findMany({
      where: { professional: { verified: true } },
      select: { healthPlan: { select: { id: true, name: true, slug: true, sortOrder: true } } },
      distinct: ["healthPlanId"],
    }),
    db.psychoanalystHealthPlan.findMany({
      where: { psychoanalyst: { verified: true } },
      select: { healthPlan: { select: { id: true, name: true, slug: true, sortOrder: true } } },
      distinct: ["healthPlanId"],
    }),
    db.integrativeTherapistHealthPlan.findMany({
      where: { integrativeTherapist: { verified: true } },
      select: { healthPlan: { select: { id: true, name: true, slug: true, sortOrder: true } } },
      distinct: ["healthPlanId"],
    }),
  ]);

  const byId = new Map<string, { id: string; name: string; slug: string; sortOrder: number }>();
  for (const row of [...proLinks, ...psychoLinks, ...integrativeLinks]) {
    const hp = row.healthPlan;
    byId.set(hp.id, {
      ...hp,
      name: fixHealthPlanDisplayName(hp.name),
    });
  }

  return dedupeHealthPlanList([...byId.values()]).sort(
    (a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0) || a.name.localeCompare(b.name),
  );
}

export type SymptomDbMatch = {
  specialtySlug: string;
  label: string;
  score: number;
  source: "subspecialty" | "service" | "pics" | "specialty" | "bio";
  matchedText?: string;
};

function scoreContains(haystack: string, query: string): number {
  const h = normalizeSearchText(haystack);
  const q = normalizeSearchText(query);
  if (!h || !q) return 0;
  if (h === q) return 100;
  if (h.includes(q)) return Math.min(90, 40 + q.length * 2);
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  let hits = 0;
  for (const w of words) {
    if (h.includes(w)) hits++;
  }
  if (hits === 0) return 0;
  return Math.min(70, 20 + hits * 15);
}

/** Search verified provider data for symptom / free-text queries. */
export async function searchSymptomsInProviderData(
  query: string,
  lang: Lang = "pt",
): Promise<SymptomDbMatch[]> {
  const q = query.trim();
  if (q.length < 2) return [];

  const scores = new Map<string, { score: number; source: SymptomDbMatch["source"]; matchedText?: string }>();

  function add(slug: string, score: number, source: SymptomDbMatch["source"], matchedText?: string) {
    if (score <= 0 || !slug) return;
    const cur = scores.get(slug);
    if (!cur || score > cur.score) {
      scores.set(slug, { score, source, matchedText });
    }
  }

  const [professionals, services, integrative] = await Promise.all([
    db.professionalProfile.findMany({
      where: { verified: true },
      select: { specialty: true, subspecialties: true, bio: true },
    }),
    db.providerService.findMany({
      where: {
        isActive: true,
        OR: [
          { professional: { verified: true } },
          { psychoanalyst: { verified: true } },
          { integrativeTherapist: { verified: true } },
        ],
      },
      select: {
        name: true,
        description: true,
        professional: { select: { specialty: true } },
        psychoanalystId: true,
        integrativeTherapist: { select: { picsPractices: true } },
      },
    }),
    db.integrativeTherapistProfile.findMany({
      where: { verified: true },
      select: { picsPractices: true, bio: true },
    }),
  ]);

  for (const p of professionals) {
    const slug = specialtyToSeoSlug(canonicalProfessionValue(p.specialty) ?? p.specialty);
    add(slug, scoreContains(getProfessionLabel(lang, p.specialty), q), "specialty");
    for (const sub of p.subspecialties) {
      add(slug, scoreContains(sub, q), "subspecialty", sub);
    }
    if (p.bio) add(slug, scoreContains(p.bio, q) * 0.6, "bio");
  }

  add("psicanalista", scoreContains(getProfessionLabel(lang, "Psychoanalysis"), q), "specialty");

  for (const t of integrative) {
    for (const picSlug of t.picsPractices) {
      const pic = picBySlug(picSlug);
      if (!pic) continue;
      const label = picLabel(pic, lang);
      add(INTEGRATIVE_SEO_SLUG, scoreContains(label, q), "pics", label);
      add(picSlug, scoreContains(label, q), "pics", label);
      add(picSlug, scoreContains(pic.descriptionPt, q) * 0.7, "pics", label);
    }
    if (t.bio) add(INTEGRATIVE_SEO_SLUG, scoreContains(t.bio, q) * 0.5, "bio");
  }

  for (const svc of services) {
    let slug = "psicanalista";
    if (svc.professional?.specialty) {
      slug = specialtyToSeoSlug(
        canonicalProfessionValue(svc.professional.specialty) ?? svc.professional.specialty,
      );
    } else if (svc.integrativeTherapist) {
      const firstPic = svc.integrativeTherapist.picsPractices[0];
      slug = firstPic && picBySlug(firstPic) ? firstPic : INTEGRATIVE_SEO_SLUG;
    }
    const svcScore = Math.max(
      scoreContains(svc.name, q),
      svc.description ? scoreContains(svc.description, q) : 0,
    );
    add(slug, svcScore, "service", svc.name);
  }

  return [...scores.entries()]
    .map(([specialtySlug, meta]) => ({
      specialtySlug,
      label: seoSlugToSpecialtyLabel(specialtySlug, lang),
      score: meta.score,
      source: meta.source,
      matchedText: meta.matchedText,
    }))
    .filter((m) => m.score >= 25)
    .sort((a, b) => b.score - a.score);
}

export { normalizeSearchText };
