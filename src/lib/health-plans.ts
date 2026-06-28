// Brazilian health plans (conv\u00eanios) for public search.

import { db } from "@/lib/db";
import { slugify } from "@/lib/public-slugs";

export const DEFAULT_HEALTH_PLANS = [
  "Unimed",
  "Amil",
  "Bradesco Sa\u00fade",
  "SulAm\u00e9rica",
  "Golden Cross",
  "NotreDame Interm\u00e9dica",
  "Hapvida",
  "Porto Seguro",
  "Prevent Senior",
  "Cassi",
] as const;

export async function ensureDefaultHealthPlans() {
  for (let i = 0; i < DEFAULT_HEALTH_PLANS.length; i++) {
    const name = DEFAULT_HEALTH_PLANS[i];
    const slug = slugify(name);
    await db.healthPlan.upsert({
      where: { slug },
      create: { name, slug, sortOrder: i },
      update: { name, sortOrder: i },
    });
  }
}

export async function listHealthPlans() {
  await ensureDefaultHealthPlans();
  return db.healthPlan.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true },
  });
}
