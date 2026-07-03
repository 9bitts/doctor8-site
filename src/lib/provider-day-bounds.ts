import { calendarDateInTimeZone, zonedTimeToUtc } from "@/lib/timezone";

/** UTC instants for start/end of "today" in the provider's IANA time zone. */
export function providerDayBounds(timeZone: string, now = new Date()): { start: Date; end: Date } {
  const dateStr = calendarDateInTimeZone(now, timeZone);
  return {
    start: zonedTimeToUtc(dateStr, "00:00:00", timeZone),
    end: zonedTimeToUtc(dateStr, "23:59:59", timeZone),
  };
}

/** UTC instant for the first moment of the current calendar month in the provider's time zone. */
export function providerMonthStart(timeZone: string, now = new Date()): Date {
  const dateStr = calendarDateInTimeZone(now, timeZone);
  const monthStartStr = `${dateStr.slice(0, 7)}-01`;
  return zonedTimeToUtc(monthStartStr, "00:00:00", timeZone);
}
