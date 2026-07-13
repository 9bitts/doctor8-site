export type BookableSlot = {
  time: string;
  datetime: string;
  available: boolean;
  /** AcuraBrasil table flag — still used by the existing acura volunteer filter. */
  volunteerOnly?: boolean;
  /** P8a scheduled voluntary care (JSON volunteerBlocks) — isolated from paid flow. */
  isVolunteer?: boolean;
  /** Server-side price hint for P8b free-booking validation (0 when isVolunteer). */
  priceCents?: number;
};

export type DaySlots = {
  date: string;
  label: string;
  slots: BookableSlot[];
};

export function filterDaysForPatientBooking(
  days: DaySlots[],
  options: { volunteersOnly: boolean },
): DaySlots[] {
  return days
    .map((day) => ({
      ...day,
      slots: day.slots
        .filter((slot) => !slot.isVolunteer)
        .map((slot) => ({
          ...slot,
          available: slot.available && (!options.volunteersOnly || !!slot.volunteerOnly),
        })),
    }))
    .filter((day) => day.slots.some((s) => s.available));
}

/** P8b — only scheduled voluntary slots (?volunteer=1). */
export function filterDaysForScheduledVolunteerBooking(days: DaySlots[]): DaySlots[] {
  return days
    .map((day) => ({
      ...day,
      slots: day.slots.filter((s) => (s.isVolunteer || s.volunteerOnly) && s.available),
    }))
    .filter((day) => day.slots.length > 0);
}

export function dayHasVolunteerSlots(days: DaySlots[]): boolean {
  return days.some((day) =>
    day.slots.some((s) => s.available && (s.volunteerOnly || s.isVolunteer)),
  );
}

/** CSS classes for patient slot picker buttons. Volunteer slots use green; regular use emerald. */
export function patientSlotButtonClass(
  slot: BookableSlot,
  selected: boolean,
  variant: "emerald" | "blue" = "emerald",
): string {
  if (!slot.available) {
    return "bg-slate-50 text-slate-300 border-slate-100 cursor-not-allowed";
  }

  const volunteer = !!slot.volunteerOnly || !!slot.isVolunteer;

  if (selected) {
    if (volunteer) return "bg-green-600 border-green-600 text-white";
    if (variant === "blue") return "bg-blue-500 border-blue-500 text-white";
    return "bg-emerald-500 border-emerald-500 text-white";
  }

  if (volunteer) {
    return "bg-green-50 border-green-400 text-green-800 hover:border-green-600";
  }

  if (variant === "blue") {
    return "border-slate-200 hover:border-blue-400 bg-white text-slate-700";
  }

  return "bg-white border-slate-200 text-slate-700 hover:border-emerald-400";
}
