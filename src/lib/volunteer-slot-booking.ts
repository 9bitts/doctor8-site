import { db } from "@/lib/db";
import { isAcuraVolunteerProvider } from "@/lib/acura-volunteer";
import { generateTimeSlots } from "@/lib/scheduling";
import type { ProviderType } from "@/lib/providers";

export type SlotProviderType = ProviderType | "integrative";
import {
  calendarDateInTimeZone,
  dayOfWeekForDateStr,
  DEFAULT_TIME_ZONE,
} from "@/lib/timezone";
import { parseAvailabilityJson } from "@/lib/availability-exceptions";
import {
  assertVolunteerScheduledApproved,
  VolunteerScheduledNotApprovedError,
  type VolunteerScheduledProviderKind,
} from "@/lib/volunteer-scheduled-approval";

export { VolunteerScheduledNotApprovedError };

type AvailabilityBlock = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMins: number;
  slotGapMins?: number;
  volunteerOnly: boolean;
  isVolunteer?: boolean;
};

export type ResolvedBookableSlot = {
  available: boolean;
  volunteerOnly: boolean;
  isVolunteer: boolean;
  priceCents?: number;
};

export async function resolveSlotAtDateTime(
  providerId: string,
  providerType: SlotProviderType,
  scheduledAtIso: string,
): Promise<ResolvedBookableSlot | null> {
  const scheduledAt = new Date(scheduledAtIso);
  if (Number.isNaN(scheduledAt.getTime())) return null;

  const blocks = await loadAvailabilityBlocks(providerId, providerType);
  if (blocks.length === 0) return null;

  const timeZone = await loadProviderTimeZone(providerId, providerType);
  const dateStr = calendarDateInTimeZone(scheduledAt, timeZone);
  const dayOfWeek = dayOfWeekForDateStr(dateStr, timeZone);
  const blocksForDay = blocks.filter((b) => b.dayOfWeek === dayOfWeek);
  if (blocksForDay.length === 0) return null;

  const now = new Date();
  const bookedTimes = await loadBookedTimes(providerId, providerType, now);
  const slots = generateTimeSlots(dateStr, timeZone, blocksForDay, bookedTimes, now);
  const target = scheduledAt.toISOString();
  const match = slots.find((s) => s.datetime === target);
  if (!match) return null;

  return {
    available: match.available,
    volunteerOnly: match.volunteerOnly,
    isVolunteer: match.isVolunteer,
    priceCents: match.priceCents,
  };
}

export async function assertVolunteerSlotBooking(
  providerId: string,
  providerType: SlotProviderType,
  scheduledAtIso: string,
): Promise<void> {
  const provider = await loadProviderVolunteerStatus(providerId, providerType);
  if (!provider) {
    throw new VolunteerSlotBookingError("provider_not_found");
  }
  if (!isAcuraVolunteerProvider(provider.verified, provider.acuraVolunteer)) {
    throw new VolunteerSlotBookingError("provider_not_volunteer");
  }

  const slot = await resolveSlotAtDateTime(providerId, providerType, scheduledAtIso);
  if (!slot) {
    throw new VolunteerSlotBookingError("slot_not_found");
  }
  if (!slot.available) {
    throw new VolunteerSlotBookingError("slot_unavailable");
  }
  if (!slot.volunteerOnly) {
    throw new VolunteerSlotBookingError("not_volunteer_slot");
  }
}

export async function assertPaidSlotBooking(
  providerId: string,
  providerType: SlotProviderType,
  scheduledAtIso: string,
): Promise<void> {
  const slot = await resolveSlotAtDateTime(providerId, providerType, scheduledAtIso);
  if (slot?.isVolunteer && slot.available) {
    throw new VolunteerSlotBookingError("scheduled_volunteer_slot_requires_free_booking");
  }
  if (slot?.volunteerOnly && slot.available) {
    throw new VolunteerSlotBookingError("volunteer_slot_requires_free_booking");
  }
}

/** P8b — slot must be a free scheduled volunteer block (isVolunteer + priceCents 0), not Acura volunteerOnly. */
export async function assertScheduledVolunteerSlotBooking(
  providerId: string,
  providerType: SlotProviderType,
  scheduledAtIso: string,
): Promise<void> {
  await assertProviderVolunteerScheduledGate(providerId, providerType);

  const slot = await resolveSlotAtDateTime(providerId, providerType, scheduledAtIso);
  if (!slot) {
    throw new VolunteerSlotBookingError("slot_not_found");
  }
  if (!slot.available) {
    throw new VolunteerSlotBookingError("slot_unavailable");
  }
  if (!slot.isVolunteer && !slot.volunteerOnly) {
    throw new VolunteerSlotBookingError("not_scheduled_volunteer_slot");
  }
  if ((slot.priceCents ?? 0) !== 0) {
    throw new VolunteerSlotBookingError("not_free_volunteer_slot");
  }
}

export class VolunteerSlotBookingError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = "VolunteerSlotBookingError";
  }
}

async function loadProviderTimeZone(
  providerId: string,
  providerType: SlotProviderType,
): Promise<string> {
  if (providerType === "psychoanalyst") {
    const row = await db.psychoanalystProfile.findUnique({
      where: { id: providerId },
      include: { user: true },
    });
    return (row?.user as { timezone?: string } | undefined)?.timezone || DEFAULT_TIME_ZONE;
  }
  if (providerType === "integrative") {
    const row = await db.integrativeTherapistProfile.findUnique({
      where: { id: providerId },
      include: { user: true },
    });
    return (row?.user as { timezone?: string } | undefined)?.timezone || DEFAULT_TIME_ZONE;
  }
  const row = await db.professionalProfile.findUnique({
    where: { id: providerId },
    select: { timezone: true } as never,
  });
  return (row as { timezone?: string } | null)?.timezone || DEFAULT_TIME_ZONE;
}

async function loadProviderVolunteerStatus(
  providerId: string,
  providerType: SlotProviderType,
): Promise<{
  verified: boolean;
  acuraVolunteer: boolean;
  volunteerScheduledApproved?: boolean;
} | null> {
  if (providerType === "psychoanalyst") {
    return db.psychoanalystProfile.findUnique({
      where: { id: providerId },
      select: { verified: true, acuraVolunteer: true },
    });
  }
  if (providerType === "integrative") {
    return db.integrativeTherapistProfile.findUnique({
      where: { id: providerId },
      select: { verified: true, acuraVolunteer: true },
    });
  }
  return db.professionalProfile.findUnique({
    where: { id: providerId },
    select: { verified: true, acuraVolunteer: true, volunteerScheduledApproved: true } as never,
  }) as Promise<{
    verified: boolean;
    acuraVolunteer: boolean;
    volunteerScheduledApproved?: boolean;
  } | null>;
}

export async function assertProviderVolunteerScheduledGate(
  providerId: string,
  providerType: SlotProviderType,
): Promise<void> {
  const kind: VolunteerScheduledProviderKind =
    providerType === "psychoanalyst"
      ? "psychoanalyst"
      : providerType === "integrative"
        ? "integrative"
        : "health";
  const profile = await loadProviderVolunteerStatus(providerId, providerType);
  if (!profile) {
    throw new VolunteerSlotBookingError("provider_not_found");
  }
  try {
    await assertVolunteerScheduledApproved(kind, profile);
  } catch (e) {
    if (e instanceof VolunteerScheduledNotApprovedError) {
      throw new VolunteerSlotBookingError("volunteer_scheduled_not_approved");
    }
    throw e;
  }
}

async function loadAvailabilityBlocks(
  providerId: string,
  providerType: SlotProviderType,
): Promise<AvailabilityBlock[]> {
  if (providerType === "psychoanalyst") {
    const rows = await db.psychoanalystAvailabilitySlot.findMany({
      where: { psychoanalystId: providerId, isActive: true },
    });
    const paid = rows
      .filter((r) => !r.volunteerOnly)
      .map((r) => ({
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        slotDurationMins: r.slotDurationMins,
        slotGapMins: r.slotGapMins,
        volunteerOnly: r.volunteerOnly,
        isVolunteer: false,
      }));
    const volunteer = rows
      .filter((r) => r.volunteerOnly)
      .map((r) => ({
        dayOfWeek: r.dayOfWeek,
        startTime: r.startTime,
        endTime: r.endTime,
        slotDurationMins: r.slotDurationMins,
        slotGapMins: r.slotGapMins,
        volunteerOnly: false,
        isVolunteer: true,
      }));
    return [...paid, ...volunteer];
  }

  if (providerType === "integrative") {
    const profile = await db.integrativeTherapistProfile.findUnique({
      where: { id: providerId },
      select: { availability: true },
    });
    const volunteerBlocks = parseAvailabilityJson(profile?.availability).volunteerBlocks ?? [];
    const rows = await db.integrativeTherapistAvailabilitySlot.findMany({
      where: { integrativeTherapistId: providerId, isActive: true },
    });
    const paid = rows.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      slotDurationMins: r.slotDurationMins,
      slotGapMins: r.slotGapMins,
      volunteerOnly: false,
      isVolunteer: false,
    }));
    const volunteer = volunteerBlocks.map((b) => ({
      dayOfWeek: b.dayOfWeek,
      startTime: b.startTime,
      endTime: b.endTime,
      slotDurationMins: b.slotDuration ?? 30,
      slotGapMins: b.slotGap ?? 0,
      volunteerOnly: false,
      isVolunteer: true,
    }));
    return [...paid, ...volunteer];
  }

  const profile = await db.professionalProfile.findUnique({
    where: { id: providerId },
    select: { availability: true },
  });
  const volunteerBlocks = parseAvailabilityJson(profile?.availability).volunteerBlocks ?? [];

  const rows = await db.availabilitySlot.findMany({
    where: { professionalId: providerId, isActive: true },
  });
  const paid = rows.map((r) => ({
    dayOfWeek: r.dayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
    slotDurationMins: r.slotDurationMins,
    slotGapMins: r.slotGapMins,
    volunteerOnly: r.volunteerOnly,
    isVolunteer: false,
  }));
  const volunteer = volunteerBlocks.map((b) => ({
    dayOfWeek: b.dayOfWeek,
    startTime: b.startTime,
    endTime: b.endTime,
    slotDurationMins: b.slotDuration ?? 30,
    slotGapMins: b.slotGap ?? 0,
    volunteerOnly: false,
    isVolunteer: true,
  }));
  return [...paid, ...volunteer];
}

async function loadBookedTimes(
  providerId: string,
  providerType: SlotProviderType,
  now: Date,
): Promise<Set<string>> {
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const providerFilter =
    providerType === "psychoanalyst"
      ? { psychoanalystId: providerId }
      : providerType === "integrative"
        ? { integrativeTherapistId: providerId }
        : { professionalId: providerId };

  const booked = await db.appointment.findMany({
    where: {
      ...providerFilter,
      status: { in: ["CONFIRMED", "PENDING"] },
      scheduledAt: { gte: now, lte: twoWeeksLater },
    },
    select: { scheduledAt: true },
  });
  return new Set(booked.map((a) => a.scheduledAt.toISOString()));
}
