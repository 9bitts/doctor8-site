// Brazilian health plans (convênios) for public search.

import { db } from "@/lib/db";
import { slugify } from "@/lib/public-slugs";
import {
  CORRUPT_HEALTH_PLAN_SLUGS,
  DEFAULT_HEALTH_PLANS,
  type HealthPlanListItem,
  canonicalHealthPlanSlug,
  dedupeHealthPlanList,
  fixHealthPlanDisplayName,
} from "@/lib/health-plan-display";

export {
  DEFAULT_HEALTH_PLANS,
  fixHealthPlanDisplayName,
  dedupeHealthPlanList,
} from "@/lib/health-plan-display";

type HealthPlanRow = HealthPlanListItem & { sortOrder: number };

function planPriority(plan: HealthPlanRow, canonicalSlug: string): number {
  let score = 0;
  if (plan.slug === canonicalSlug) score += 20;
  if (!plan.name.includes("?")) score += 10;
  if ((DEFAULT_HEALTH_PLANS as readonly string[]).includes(fixHealthPlanDisplayName(plan.name))) {
    score += 5;
  }
  score -= plan.sortOrder;
  return score;
}

function pickPreferredPlan(plans: HealthPlanRow[], canonicalSlug: string): HealthPlanRow {
  return [...plans].sort(
    (a, b) => planPriority(b, canonicalSlug) - planPriority(a, canonicalSlug),
  )[0];
}

async function mergeHealthPlanReferences(fromId: string, toId: string) {
  if (fromId === toId) return;

  const proLinks = await db.professionalHealthPlan.findMany({
    where: { healthPlanId: fromId },
  });
  for (const link of proLinks) {
    const exists = await db.professionalHealthPlan.findUnique({
      where: {
        professionalId_healthPlanId: {
          professionalId: link.professionalId,
          healthPlanId: toId,
        },
      },
    });
    if (exists) {
      await db.professionalHealthPlan.delete({
        where: {
          professionalId_healthPlanId: {
            professionalId: link.professionalId,
            healthPlanId: fromId,
          },
        },
      });
    } else {
      await db.professionalHealthPlan.update({
        where: {
          professionalId_healthPlanId: {
            professionalId: link.professionalId,
            healthPlanId: fromId,
          },
        },
        data: { healthPlanId: toId },
      });
    }
  }

  const psychoLinks = await db.psychoanalystHealthPlan.findMany({
    where: { healthPlanId: fromId },
  });
  for (const link of psychoLinks) {
    const exists = await db.psychoanalystHealthPlan.findUnique({
      where: {
        psychoanalystId_healthPlanId: {
          psychoanalystId: link.psychoanalystId,
          healthPlanId: toId,
        },
      },
    });
    if (exists) {
      await db.psychoanalystHealthPlan.delete({
        where: {
          psychoanalystId_healthPlanId: {
            psychoanalystId: link.psychoanalystId,
            healthPlanId: fromId,
          },
        },
      });
    } else {
      await db.psychoanalystHealthPlan.update({
        where: {
          psychoanalystId_healthPlanId: {
            psychoanalystId: link.psychoanalystId,
            healthPlanId: fromId,
          },
        },
        data: { healthPlanId: toId },
      });
    }
  }

  const integrativeLinks = await db.integrativeTherapistHealthPlan.findMany({
    where: { healthPlanId: fromId },
  });
  for (const link of integrativeLinks) {
    const exists = await db.integrativeTherapistHealthPlan.findUnique({
      where: {
        integrativeTherapistId_healthPlanId: {
          integrativeTherapistId: link.integrativeTherapistId,
          healthPlanId: toId,
        },
      },
    });
    if (exists) {
      await db.integrativeTherapistHealthPlan.delete({
        where: {
          integrativeTherapistId_healthPlanId: {
            integrativeTherapistId: link.integrativeTherapistId,
            healthPlanId: fromId,
          },
        },
      });
    } else {
      await db.integrativeTherapistHealthPlan.update({
        where: {
          integrativeTherapistId_healthPlanId: {
            integrativeTherapistId: link.integrativeTherapistId,
            healthPlanId: fromId,
          },
        },
        data: { healthPlanId: toId },
      });
    }
  }

  await db.organizationHealthPlan.updateMany({
    where: { healthPlanId: fromId },
    data: { healthPlanId: toId },
  });

  await db.healthPlan.delete({ where: { id: fromId } });
}

async function repairCorruptHealthPlans() {
  for (const [badSlug, goodSlug] of Object.entries(CORRUPT_HEALTH_PLAN_SLUGS)) {
    const bad = await db.healthPlan.findUnique({ where: { slug: badSlug } });
    const good = await db.healthPlan.findUnique({ where: { slug: goodSlug } });
    if (bad && good && bad.id !== good.id) {
      await mergeHealthPlanReferences(bad.id, good.id);
    }
  }

  const corruptPlans = await db.healthPlan.findMany({
    where: { name: { contains: "?" } },
  });

  for (const corrupt of corruptPlans) {
    const canonicalName = fixHealthPlanDisplayName(corrupt.name);
    const canonicalSlug = slugify(canonicalName);
    const canonical = await db.healthPlan.findUnique({ where: { slug: canonicalSlug } });

    if (canonical && canonical.id !== corrupt.id) {
      await mergeHealthPlanReferences(corrupt.id, canonical.id);
      continue;
    }

    await db.healthPlan.update({
      where: { id: corrupt.id },
      data: { name: canonicalName, slug: canonicalSlug },
    });
  }
}

async function dedupeHealthPlansInDb() {
  const all = await db.healthPlan.findMany({ orderBy: { sortOrder: "asc" } });
  const groups = new Map<string, HealthPlanRow[]>();

  for (const plan of all) {
    const key = canonicalHealthPlanSlug(plan.name);
    const group = groups.get(key) ?? [];
    group.push(plan);
    groups.set(key, group);
  }

  for (const [canonicalSlug, group] of groups) {
    if (group.length <= 1) {
      const only = group[0];
      const name = fixHealthPlanDisplayName(only.name);
      if (only.name !== name || only.slug !== canonicalSlug) {
        await db.healthPlan.update({
          where: { id: only.id },
          data: { name, slug: canonicalSlug },
        });
      }
      continue;
    }

    const keeper = pickPreferredPlan(group, canonicalSlug);
    const keeperName = fixHealthPlanDisplayName(keeper.name);

    for (const duplicate of group) {
      if (duplicate.id === keeper.id) continue;
      await mergeHealthPlanReferences(duplicate.id, keeper.id);
    }

    await db.healthPlan.update({
      where: { id: keeper.id },
      data: { name: keeperName, slug: canonicalSlug },
    });
  }
}

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

  await repairCorruptHealthPlans();
  await dedupeHealthPlansInDb();
}

export async function listHealthPlans() {
  await ensureDefaultHealthPlans();
  const plans = await db.healthPlan.findMany({
    orderBy: { sortOrder: "asc" },
    select: { id: true, name: true, slug: true, sortOrder: true },
  });

  return dedupeHealthPlanList(plans);
}
