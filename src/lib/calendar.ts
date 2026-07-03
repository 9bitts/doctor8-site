// Generate .ics calendar files for appointments.

function formatIcsUtc(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

function escapeIcs(text: string): string {
  return text
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\n/g, "\\n");
}

export function buildCalendarIcs(events: {
  appointmentId: string;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  start: Date;
  end: Date;
}[]): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Doctor8//Appointments//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
  ];

  for (const evt of events) {
    lines.push(
      "BEGIN:VEVENT",
      `UID:appointment-${evt.appointmentId}@doctor8.app`,
      `DTSTAMP:${formatIcsUtc(new Date())}`,
      `DTSTART:${formatIcsUtc(evt.start)}`,
      `DTEND:${formatIcsUtc(evt.end)}`,
      `SUMMARY:${escapeIcs(evt.summary)}`,
    );
    if (evt.description) lines.push(`DESCRIPTION:${escapeIcs(evt.description)}`);
    if (evt.location) lines.push(`LOCATION:${escapeIcs(evt.location)}`);
    if (evt.url) lines.push(`URL:${evt.url}`);
    lines.push("END:VEVENT");
  }

  lines.push("END:VCALENDAR");
  return lines.join("\r\n");
}

export function buildAppointmentIcs(opts: {
  appointmentId: string;
  summary: string;
  description?: string;
  location?: string;
  url?: string;
  start: Date;
  end: Date;
}): string {
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Doctor8//Appointments//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:appointment-${opts.appointmentId}@doctor8.app`,
    `DTSTAMP:${formatIcsUtc(new Date())}`,
    `DTSTART:${formatIcsUtc(opts.start)}`,
    `DTEND:${formatIcsUtc(opts.end)}`,
    `SUMMARY:${escapeIcs(opts.summary)}`,
  ];

  if (opts.description) lines.push(`DESCRIPTION:${escapeIcs(opts.description)}`);
  if (opts.location) lines.push(`LOCATION:${escapeIcs(opts.location)}`);
  if (opts.url) lines.push(`URL:${opts.url}`);

  lines.push("END:VEVENT", "END:VCALENDAR");
  return lines.join("\r\n");
}
