import { timeToMins } from "@/lib/scheduling";

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
