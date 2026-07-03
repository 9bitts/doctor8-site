import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireIntegrativeTherapist } from "@/lib/integrative-therapist-api";
import { validateAvailabilityBlocks, validatePaidVolunteerOverlap } from "@/lib/availability-validation";
import { isAcuraVolunteerProvider } from "@/lib/acura-volunteer";
import {
  DEFAULT_TIME_ZONE,
  isValidIanaTimeZone,
} from "@/lib/timezone";
import {
  mergeAvailabilityJson,
  mergeVolunteerBlocksJson,
  parseAvailabilityJson,
  type DateAvailabilityBlock,
  type VolunteerWeeklyBlock,
} from "@/lib/availability-exceptions";
import { z } from "zod";

const volunteerBlockSchema = z.object({
  id: z.string(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  slotDuration: z.number().int().positive().optional(),
  slotGap: z.number().int().min(0).optional(),
});

const putSchema = z.object({
  slots: z.array(
    z.object({
      dayOfWeek: z.number().int().min(0).max(6),
      startTime: z.string(),
      endTime: z.string(),
      slotDuration: z.number().int().positive(),
      slotGap: z.number().int().min(0).optional(),
    }),
  ).optional(),
  timezone: z.string().optional(),
  dateBlocks: z.array(
    z.object({
      id: z.string(),
      startDate: z.string(),
      endDate: z.string().optional(),
      startTime: z.string().optional(),
      endTime: z.string().optional(),
      label: z.string().optional(),
    }),
  ).optional(),
  volunteerBlocks: z.array(volunteerBlockSchema).optional(),
});

export async function GET() {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const parsed = parseAvailabilityJson(therapist.availability);
  const slots = await db.integrativeTherapistAvailabilitySlot.findMany({
    where: { integrativeTherapistId: therapist.id, isActive: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  const user = await db.user.findUnique({
    where: { id: therapist.userId },
    select: { timezone: true },
  });
  const userTz = user?.timezone ?? DEFAULT_TIME_ZONE;

  return NextResponse.json({
    acuraVolunteer: therapist.acuraVolunteer,
    badgeVisible: isAcuraVolunteerProvider(therapist.verified, therapist.acuraVolunteer),
    timezone: userTz,
    dateBlocks: parsed.dateBlocks ?? [],
    volunteerBlocks: parsed.volunteerBlocks ?? [],
    slots: slots.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      slotDuration: s.slotDurationMins,
      slotGap: s.slotGapMins,
      volunteerOnly: false,
    })),
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await requireIntegrativeTherapist();
  if ("error" in ctx && ctx.error) return ctx.error;
  const { therapist } = ctx as Exclude<typeof ctx, { error: NextResponse }>;

  const parsedBody = putSchema.safeParse(await req.json());
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.flatten() }, { status: 400 });
  }

  const { slots, timezone, dateBlocks, volunteerBlocks } = parsedBody.data;

  if (timezone !== undefined) {
    if (!isValidIanaTimeZone(timezone)) {
      return NextResponse.json({ error: "INVALID_TIMEZONE" }, { status: 400 });
    }
    await db.user.update({
      where: { id: therapist.userId },
      data: { timezone },
    });
  }

  if (dateBlocks !== undefined) {
    const merged = mergeAvailabilityJson(therapist.availability, dateBlocks as DateAvailabilityBlock[]);
    await db.integrativeTherapistProfile.update({
      where: { id: therapist.id },
      data: { availability: merged },
    });
  }

  if (volunteerBlocks !== undefined) {
    const normalizedVolunteer = (volunteerBlocks as VolunteerWeeklyBlock[]).map((b) => ({
      id: b.id,
      dayOfWeek: b.dayOfWeek,
      startTime: b.startTime,
      endTime: b.endTime,
      slotDuration: b.slotDuration ?? 30,
      slotGap: b.slotGap ?? 0,
    }));

    if (
      normalizedVolunteer.length > 0 &&
      !isAcuraVolunteerProvider(therapist.verified, therapist.acuraVolunteer)
    ) {
      return NextResponse.json({ error: "ACURA_VOLUNTEER_REQUIRED" }, { status: 400 });
    }

    const mergedVolunteer = mergeVolunteerBlocksJson(therapist.availability, normalizedVolunteer);
    await db.integrativeTherapistProfile.update({
      where: { id: therapist.id },
      data: { availability: mergedVolunteer },
    });
  }

  if (slots === undefined) {
    return NextResponse.json({ ok: true });
  }

  const normalized = slots.map((s) => ({
    dayOfWeek: s.dayOfWeek,
    startTime: s.startTime,
    endTime: s.endTime,
    slotDurationMins: s.slotDuration,
    slotGapMins: s.slotGap ?? 0,
    volunteerOnly: false,
  }));

  const validationError = validateAvailabilityBlocks(normalized);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const parsedAvail = parseAvailabilityJson(therapist.availability);
  const volunteerForOverlap =
    volunteerBlocks !== undefined
      ? (volunteerBlocks as VolunteerWeeklyBlock[]).map((b) => ({
          dayOfWeek: b.dayOfWeek,
          startTime: b.startTime,
          endTime: b.endTime,
        }))
      : (parsedAvail.volunteerBlocks ?? []);
  const volunteerOverlap = validatePaidVolunteerOverlap(normalized, volunteerForOverlap);
  if (volunteerOverlap) {
    return NextResponse.json({ error: volunteerOverlap }, { status: 400 });
  }

  await db.$transaction([
    db.integrativeTherapistAvailabilitySlot.deleteMany({
      where: { integrativeTherapistId: therapist.id },
    }),
    ...(normalized.length > 0
      ? [
          db.integrativeTherapistAvailabilitySlot.createMany({
            data: normalized.map((s) => ({
              integrativeTherapistId: therapist.id,
              dayOfWeek: s.dayOfWeek,
              startTime: s.startTime,
              endTime: s.endTime,
              slotDurationMins: s.slotDurationMins,
              slotGapMins: s.slotGapMins,
              isActive: true,
            })),
          }),
        ]
      : []),
  ]);

  return NextResponse.json({ ok: true });
}
