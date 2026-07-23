// Scheduling rules per health plan (conv?nio).

import { db } from "@/lib/db";
import type { ProviderType } from "@/lib/providers";
import type { DaySlots } from "@/lib/availability-slots";

export type HealthPlanSchedulingRule = {
  allowedWeekdays: number[];
  minLeadDays: number;
};

export async function getHealthPlanSchedulingRule(
  providerId: string,
  providerType: ProviderType,
  healthPlanSlug: string | null | undefined
): Promise<HealthPlanSchedulingRule | null> {
  if (!healthPlanSlug || healthPlanSlug === "particular") return null;

  if (providerType === "psychoanalyst") {
    const row = await db.psychoanalystHealthPlan.findFirst({
      where: {
        psychoanalystId: providerId,
        healthPlan: { slug: healthPlanSlug },
      },
    });
    if (!row) return null;
    return { allowedWeekdays: row.allowedWeekdays, minLeadDays: row.minLeadDays };
  }

  if (providerType === "integrative") {
    const row = await db.integrativeTherapistHealthPlan.findFirst({
      where: {
        integrativeTherapistId: providerId,
        healthPlan: { slug: healthPlanSlug },
      },
    });
    if (!row) return null;
    return { allowedWeekdays: row.allowedWeekdays, minLeadDays: row.minLeadDays };
  }

  const row = await db.professionalHealthPlan.findFirst({
    where: {
      professionalId: providerId,
      healthPlan: { slug: healthPlanSlug },
    },
  });
  if (!row) return null;
  return { allowedWeekdays: row.allowedWeekdays, minLeadDays: row.minLeadDays };
}

export function applyHealthPlanSlotFilter(
  days: DaySlots[],
  rule: HealthPlanSchedulingRule | null,
  now = new Date()
): DaySlots[] {
  if (!rule) return days;

  const minDate = new Date(now);
  minDate.setHours(0, 0, 0, 0);
  minDate.setDate(minDate.getDate() + rule.minLeadDays);

  return days
    .map((day) => {
      const [y, m, d] = day.date.split("-").map(Number);
      const dayDate = new Date(y, m - 1, d);
      const dayOfWeek = dayDate.getDay();

      if (rule.allowedWeekdays.length > 0 && !rule.allowedWeekdays.includes(dayOfWeek)) {
        return null;
      }
      if (dayDate < minDate) return null;

      return day;
    })
    .filter((day): day is DaySlots => day !== null);
}
