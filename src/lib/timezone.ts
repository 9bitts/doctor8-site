// Timezone helpers ? native Intl only (no date-fns-tz / luxon / dayjs).
//
// Sanity (wall clock ? UTC):
//   zonedTimeToUtc("2026-07-02", "09:00", "America/Sao_Paulo") ? 2026-07-02T12:00:00.000Z
//   zonedTimeToUtc("2026-01-15", "09:00", "America/New_York")   ? 2026-01-15T14:00:00.000Z (EST)
//   zonedTimeToUtc("2026-07-02", "09:00", "Europe/Lisbon")      ? 2026-07-02T08:00:00.000Z (WEST)

export const DEFAULT_TIME_ZONE = "America/Sao_Paulo";

/** Common IANA zones when Intl.supportedValuesOf is unavailable. */
export const FALLBACK_TIME_ZONES = [
  "America/Sao_Paulo",
  "America/New_York",
  "America/Chicago",
  "America/Denver",
  "America/Los_Angeles",
  "Europe/Lisbon",
  "Europe/Madrid",
  "Europe/London",
  "Europe/Paris",
  "Europe/Berlin",
  "Europe/Rome",
] as const;

export function isValidIanaTimeZone(tz: string): boolean {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone").includes(tz);
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

export function listTimeZoneOptions(): string[] {
  if (typeof Intl.supportedValuesOf === "function") {
    return Intl.supportedValuesOf("timeZone");
  }
  return [...FALLBACK_TIME_ZONES];
}

/** Offset of `timeZone` at `date` (ms to add to UTC to reach wall-clock parts in that zone). */
export function getTimeZoneOffsetMs(date: Date, timeZone: string): number {
  const dtf = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hourCycle: "h23",
  });
  const parts = dtf.formatToParts(date);
  const map: Record<string, string> = {};
  for (const p of parts) {
    if (p.type !== "literal") map[p.type] = p.value;
  }
  const asUtc = Date.UTC(
    Number(map.year),
    Number(map.month) - 1,
    Number(map.day),
    Number(map.hour),
    Number(map.minute),
    Number(map.second),
  );
  return asUtc - date.getTime();
}

/** Wall clock in `timeZone` on `dateStr` at `timeStr` ? UTC instant. */
export function zonedTimeToUtc(dateStr: string, timeStr: string, timeZone: string): Date {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const timeParts = timeStr.split(":").map(Number);
  const h = timeParts[0] ?? 0;
  const mi = timeParts[1] ?? 0;
  const s = timeParts[2] ?? 0;

  let utcMs = Date.UTC(y, mo - 1, d, h, mi, s);
  for (let i = 0; i < 2; i++) {
    const offset = getTimeZoneOffsetMs(new Date(utcMs), timeZone);
    utcMs = Date.UTC(y, mo - 1, d, h, mi, s) - offset;
  }
  return new Date(utcMs);
}

/** YYYY-MM-DD calendar date for `instant` in `timeZone`. */
export function calendarDateInTimeZone(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(instant);
}

/** Add calendar days to YYYY-MM-DD (date-only math). */
export function addCalendarDays(dateStr: string, days: number): string {
  const [y, mo, d] = dateStr.split("-").map(Number);
  const dt = new Date(Date.UTC(y, mo - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/** 0=Sun ? 6=Sat for a calendar date interpreted in `timeZone`. */
export function dayOfWeekForDateStr(dateStr: string, timeZone: string): number {
  const instant = zonedTimeToUtc(dateStr, "12:00", timeZone);
  const short = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
  }).format(instant);
  const map: Record<string, number> = {
    Sun: 0,
    Mon: 1,
    Tue: 2,
    Wed: 3,
    Thu: 4,
    Fri: 5,
    Sat: 6,
  };
  return map[short] ?? 0;
}

/** Format a UTC instant for display in a specific IANA time zone. */
export function formatInTimeZone(
  date: Date,
  timeZone: string,
  locale: string,
  options: Intl.DateTimeFormatOptions,
): string {
  return new Intl.DateTimeFormat(locale, { ...options, timeZone }).format(date);
}

export function formatShortDate(date: Date, timeZone: string, locale: string): string {
  return formatInTimeZone(date, timeZone, locale, { month: "short", day: "numeric" });
}

export function formatShortDateWithWeekday(date: Date, timeZone: string, locale: string): string {
  return formatInTimeZone(date, timeZone, locale, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatShortDateWithYear(date: Date, timeZone: string, locale: string): string {
  return formatInTimeZone(date, timeZone, locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatLongDate(date: Date, timeZone: string, locale: string): string {
  return formatInTimeZone(date, timeZone, locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
  });
}

export function formatShortTime(date: Date, timeZone: string, locale: string): string {
  return formatInTimeZone(date, timeZone, locale, {
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function formatDateTime(date: Date, timeZone: string, locale: string): string {
  return formatInTimeZone(date, timeZone, locale, {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Short offset/name label, e.g. "GMT-3" or "EST". */
export function getTimeZoneLabel(
  timeZone: string,
  locale: string,
  at: Date = new Date(),
): string {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone,
    timeZoneName: "short",
  }).formatToParts(at);
  return parts.find((p) => p.type === "timeZoneName")?.value ?? timeZone;
}

/** Appointment clock time; appends zone label when not the platform default. */
export function formatAppointmentTimeWithLabel(
  date: Date,
  timeZone: string,
  locale: string,
): string {
  const time = formatShortTime(date, timeZone, locale);
  if (timeZone === DEFAULT_TIME_ZONE) return time;
  return `${time} (${getTimeZoneLabel(timeZone, locale, date)})`;
}

export function formatEmailAppointmentDateTime(
  scheduledAt: Date,
  timeZone: string,
  locale: string,
): { dateStr: string; timeStr: string } {
  return {
    dateStr: formatInTimeZone(scheduledAt, timeZone, locale, {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }),
    timeStr: formatAppointmentTimeWithLabel(scheduledAt, timeZone, locale),
  };
}

/** Weekday + day number for slot day chips, derived from a slot ISO instant. */
export function dayChipFromInstant(
  date: Date,
  timeZone: string,
  locale: string,
): { weekday: string; dayNum: string } {
  return {
    weekday: formatInTimeZone(date, timeZone, locale, { weekday: "short" }),
    dayNum: formatInTimeZone(date, timeZone, locale, { day: "numeric" }),
  };
}

/** First available slot instant for day-chip labels in the patient's time zone. */
export function refInstantFromDaySlots(
  slots: { datetime: string; available?: boolean }[],
): Date | null {
  const iso =
    slots.find((s) => s.available !== false)?.datetime ?? slots[0]?.datetime;
  return iso ? new Date(iso) : null;
}
