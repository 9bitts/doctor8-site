// Shared helpers for availability slot generation and display.

export function localDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export function parseLocalDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function countSlotsInRange(
  startTime: string,
  endTime: string,
  slotDuration: number
): number {
  const [sh, sm] = startTime.split(":").map(Number);
  const [eh, em] = endTime.split(":").map(Number);
  const mins = eh * 60 + em - (sh * 60 + sm);
  if (mins <= 0 || slotDuration <= 0) return 0;
  return Math.floor(mins / slotDuration);
}

interface AvailabilityBlock {
  startTime: string;
  endTime: string;
  slotDurationMins: number;
}

export function generateTimeSlots(
  date: Date,
  blocks: AvailabilityBlock[],
  bookedTimes: Set<string>,
  now: Date
): { time: string; datetime: string; available: boolean }[] {
  const slots: { time: string; datetime: string; available: boolean }[] = [];

  for (const block of blocks) {
    const [startHour, startMin] = block.startTime.split(":").map(Number);
    const [endHour, endMin] = block.endTime.split(":").map(Number);
    const duration = block.slotDurationMins;

    let currentHour = startHour;
    let currentMin = startMin;

    while (
      currentHour < endHour ||
      (currentHour === endHour && currentMin < endMin)
    ) {
      const slotDate = new Date(date);
      slotDate.setHours(currentHour, currentMin, 0, 0);

      const isPast = slotDate.getTime() < now.getTime() + 60 * 60 * 1000;
      const isBooked = bookedTimes.has(slotDate.toISOString());

      const timeStr = `${String(currentHour).padStart(2, "0")}:${String(currentMin).padStart(2, "0")}`;

      slots.push({
        time: timeStr,
        datetime: slotDate.toISOString(),
        available: !isPast && !isBooked,
      });

      currentMin += duration;
      if (currentMin >= 60) {
        currentHour += Math.floor(currentMin / 60);
        currentMin = currentMin % 60;
      }
    }
  }

  return slots.sort((a, b) => a.datetime.localeCompare(b.datetime));
}
