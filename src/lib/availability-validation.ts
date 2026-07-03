import { timeToMins } from "@/lib/scheduling";
import type { VolunteerWeeklyBlock } from "@/lib/availability-exceptions";

export type AvailabilityBlockInput = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  volunteerOnly?: boolean;
};

function rangesOverlap(startA: string, endA: string, startB: string, endB: string): boolean {
  const a0 = timeToMins(startA);
  const a1 = timeToMins(endA);
  const b0 = timeToMins(startB);
  const b1 = timeToMins(endB);
  if (a1 <= a0 || b1 <= b0) return false;
  return a0 < b1 && b0 < a1;
}

/** Returns an i18n key when blocks overlap on the same weekday (volunteer vs regular or any pair). */
export function validateAvailabilityBlocks(blocks: AvailabilityBlockInput[]): string | null {
  for (const block of blocks) {
    if (timeToMins(block.endTime) <= timeToMins(block.startTime)) {
      return "avail.invalidRange";
    }
  }

  for (let i = 0; i < blocks.length; i++) {
    for (let j = i + 1; j < blocks.length; j++) {
      const a = blocks[i];
      const b = blocks[j];
      if (a.dayOfWeek !== b.dayOfWeek) continue;
      if (rangesOverlap(a.startTime, a.endTime, b.startTime, b.endTime)) {
        return "avail.overlapError";
      }
    }
  }

  return null;
}

/** Returns an i18n key when paid weekly blocks overlap scheduled volunteer blocks. */
export function validatePaidVolunteerOverlap(
  paidBlocks: AvailabilityBlockInput[],
  volunteerBlocks: Pick<VolunteerWeeklyBlock, "dayOfWeek" | "startTime" | "endTime">[],
): string | null {
  for (const block of volunteerBlocks) {
    if (timeToMins(block.endTime) <= timeToMins(block.startTime)) {
      return "avail.invalidRange";
    }
  }

  const volunteerOverlap = validateAvailabilityBlocks(
    volunteerBlocks.map((b) => ({
      dayOfWeek: b.dayOfWeek,
      startTime: b.startTime,
      endTime: b.endTime,
    })),
  );
  if (volunteerOverlap) return volunteerOverlap;

  for (const paid of paidBlocks) {
    for (const vol of volunteerBlocks) {
      if (paid.dayOfWeek !== vol.dayOfWeek) continue;
      if (rangesOverlap(paid.startTime, paid.endTime, vol.startTime, vol.endTime)) {
        return "avail.voluntaryOverlapPaid";
      }
    }
  }

  return null;
}
