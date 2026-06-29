import { db } from "@/lib/db";
import { isAcuraVolunteerProvider } from "@/lib/acura-volunteer";
import { generateTimeSlots } from "@/lib/scheduling";
import type { ProviderType } from "@/lib/providers";

type AvailabilityBlock = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  slotDurationMins: number;
  slotGapMins?: number;
  volunteerOnly: boolean;
};

export type ResolvedBookableSlot = {
  available: boolean;
  volunteerOnly: boolean;
};

export async function resolveSlotAtDateTime(
  providerId: string,
  providerType: ProviderType,
  scheduledAtIso: string,
): Promise<ResolvedBookableSlot | null> {
  const scheduledAt = new Date(scheduledAtIso);
  if (Number.isNaN(scheduledAt.getTime())) return null;

  const blocks = await loadAvailabilityBlocks(providerId, providerType);
  if (blocks.length === 0) return null;

  const dayStart = new Date(scheduledAt);
  dayStart.setHours(0, 0, 0, 0);
  const dayOfWeek = dayStart.getDay();
  const blocksForDay = blocks.filter((b) => b.dayOfWeek === dayOfWeek);
  if (blocksForDay.length === 0) return null;

  const now = new Date();
  const bookedTimes = await loadBookedTimes(providerId, providerType, now);
  const slots = generateTimeSlots(dayStart, blocksForDay, bookedTimes, now);
  const target = scheduledAt.toISOString();
  const match = slots.find((s) => s.datetime === target);
  if (!match) return null;

  return { available: match.available, volunteerOnly: match.volunteerOnly };
}

export async function assertVolunteerSlotBooking(
  providerId: string,
  providerType: ProviderType,
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
  providerType: ProviderType,
  scheduledAtIso: string,
): Promise<void> {
  const slot = await resolveSlotAtDateTime(providerId, providerType, scheduledAtIso);
  if (slot?.volunteerOnly && slot.available) {
    throw new VolunteerSlotBookingError("volunteer_slot_requires_free_booking");
  }
}

export class VolunteerSlotBookingError extends Error {
  constructor(public code: string) {
    super(code);
    this.name = "VolunteerSlotBookingError";
  }
}

async function loadProviderVolunteerStatus(
  providerId: string,
  providerType: ProviderType,
): Promise<{ verified: boolean; acuraVolunteer: boolean } | null> {
  if (providerType === "psychoanalyst") {
    return db.psychoanalystProfile.findUnique({
      where: { id: providerId },
      select: { verified: true, acuraVolunteer: true },
    });
  }
  return db.professionalProfile.findUnique({
    where: { id: providerId },
    select: { verified: true, acuraVolunteer: true },
  });
}

async function loadAvailabilityBlocks(
  providerId: string,
  providerType: ProviderType,
): Promise<AvailabilityBlock[]> {
  if (providerType === "psychoanalyst") {
    const rows = await db.psychoanalystAvailabilitySlot.findMany({
      where: { psychoanalystId: providerId, isActive: true },
    });
    return rows.map((r) => ({
      dayOfWeek: r.dayOfWeek,
      startTime: r.startTime,
      endTime: r.endTime,
      slotDurationMins: r.slotDurationMins,
      slotGapMins: r.slotGapMins,
      volunteerOnly: r.volunteerOnly,
    }));
  }

  const rows = await db.availabilitySlot.findMany({
    where: { professionalId: providerId, isActive: true },
  });
  return rows.map((r) => ({
    dayOfWeek: r.dayOfWeek,
    startTime: r.startTime,
    endTime: r.endTime,
    slotDurationMins: r.slotDurationMins,
    slotGapMins: r.slotGapMins,
    volunteerOnly: r.volunteerOnly,
  }));
}

async function loadBookedTimes(
  providerId: string,
  providerType: ProviderType,
  now: Date,
): Promise<Set<string>> {
  const twoWeeksLater = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);
  const providerFilter =
    providerType === "psychoanalyst"
      ? { psychoanalystId: providerId }
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
