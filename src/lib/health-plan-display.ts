import { slugify } from "@/lib/public-slugs";

export const DEFAULT_HEALTH_PLANS = [
  "Unimed",
  "Amil",
  "Bradesco Sa?de",
  "SulAm?rica",
  "Golden Cross",
  "NotreDame Interm?dica",
  "Hapvida",
  "Porto Seguro",
  "Prevent Senior",
  "Cassi",
] as const;

const CORRUPT_HEALTH_PLAN_NAMES: Record<string, string> = {
  "Bradesco Sa?de": "Bradesco Sa?de",
  "SulAm?rica": "SulAm?rica",
  "NotreDame Interm?dica": "NotreDame Interm?dica",
};

export const CORRUPT_HEALTH_PLAN_SLUGS: Record<string, string> = {
  "bradesco-sa-de": "bradesco-saude",
  "sulam-rica": "sulamerica",
  "notredame-interm-dica": "notredame-intermedica",
};

export type HealthPlanListItem = {
  id: string;
  name: string;
  slug: string;
  sortOrder?: number;
};

export function fixHealthPlanDisplayName(name: string): string {
  return CORRUPT_HEALTH_PLAN_NAMES[name] ?? name;
}

export function canonicalHealthPlanSlug(name: string): string {
  const fixed = fixHealthPlanDisplayName(name);
  const mapped = CORRUPT_HEALTH_PLAN_SLUGS[slugify(fixed)] ?? slugify(fixed);
  return mapped;
}

function planPriority(plan: HealthPlanListItem, canonicalSlug: string): number {
  let score = 0;
  if (plan.slug === canonicalSlug) score += 20;
  if (!plan.name.includes("?")) score += 10;
  if ((DEFAULT_HEALTH_PLANS as readonly string[]).includes(fixHealthPlanDisplayName(plan.name))) {
    score += 5;
  }
  score -= plan.sortOrder ?? 0;
  return score;
}

function pickPreferredPlan<T extends HealthPlanListItem>(
  plans: T[],
  canonicalSlug: string,
): T {
  return [...plans].sort(
    (a, b) => planPriority(b, canonicalSlug) - planPriority(a, canonicalSlug),
  )[0];
}

export function dedupeHealthPlanList<T extends HealthPlanListItem>(plans: T[]): T[] {
  const groups = new Map<string, T[]>();

  for (const plan of plans) {
    const key = canonicalHealthPlanSlug(plan.name);
    const group = groups.get(key) ?? [];
    group.push(plan);
    groups.set(key, group);
  }

  const allowedSlugs = new Set(DEFAULT_HEALTH_PLANS.map((name) => slugify(name)));

  return [...groups.entries()]
    .map(([canonicalSlug, group]) => {
      const preferred = pickPreferredPlan(group, canonicalSlug);
      const name = fixHealthPlanDisplayName(preferred.name);
      return { ...preferred, name, slug: canonicalSlug };
    })
    .filter((plan) => allowedSlugs.has(plan.slug))
    .sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
}
