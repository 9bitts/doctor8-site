// src/app/api/professional/availability/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { validateAvailabilityBlocks, validatePaidVolunteerOverlap } from "@/lib/availability-validation";
import { isAcuraVolunteerProvider } from "@/lib/acura-volunteer";
import {
  isValidIanaTimeZone,
  DEFAULT_TIME_ZONE,
} from "@/lib/timezone";
import {
  mergeAvailabilityJson,
  mergeVolunteerBlocksJson,
  parseAvailabilityJson,
  type DateAvailabilityBlock,
  type VolunteerWeeklyBlock,
} from "@/lib/availability-exceptions";
import {
  cancelVolunteerBlockConflicts,
  findVolunteerBlockConflicts,
} from "@/lib/volunteer-block-removal";
import { localeOf } from "@/lib/i18n/translations";
import { z } from "zod";

const volunteerBlockSchema = z.object({
  id: z.string(),
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  slotDuration: z.number().int().positive().optional(),
  slotGap: z.number().int().min(0).optional(),
});

const dateBlockSchema = z.object({
  id: z.string(),
  startDate: z.string(),
  endDate: z.string().optional(),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  label: z.string().optional(),
});

const slotSchema = z.object({
  dayOfWeek: z.number().int().min(0).max(6),
  startTime: z.string(),
  endTime: z.string(),
  slotDuration: z.number().int().positive(),
  slotGap: z.number().int().min(0).optional(),
  volunteerOnly: z.boolean().optional(),
});

const putAvailabilitySchema = z.object({
  slots: z.array(slotSchema).optional(),
  timezone: z.string().optional(),
  dateBlocks: z.array(dateBlockSchema).optional(),
  volunteerBlocks: z.array(volunteerBlockSchema).optional(),
  confirmVolunteerBlockRemoval: z.boolean().optional(),
  cancelAppointmentIds: z.array(z.string()).optional(),
});

export async function GET() {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const raw = await db.professionalProfile.findUnique({
    where: { id: ctx.professional.id },
    select: {
      id: true,
      acuraVolunteer: true,
      verified: true,
      timezone: true,
      availability: true,
    } as never,
  });
  const professional = raw as {
    id: string;
    acuraVolunteer: boolean;
    verified: boolean;
    timezone: string;
    availability?: unknown;
  } | null;
  if (!professional) {
    return NextResponse.json({ slots: [], acuraVolunteer: false, badgeVisible: false, timezone: DEFAULT_TIME_ZONE });
  }

  const proTz = (professional as { timezone?: string }).timezone ?? DEFAULT_TIME_ZONE;
  const parsed = parseAvailabilityJson(professional.availability);
  const dateBlocks = parsed.dateBlocks ?? [];
  const volunteerBlocks = parsed.volunteerBlocks ?? [];

  const slots = await db.availabilitySlot.findMany({
    where: { professionalId: professional.id, isActive: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({
    acuraVolunteer: professional.acuraVolunteer,
    badgeVisible: isAcuraVolunteerProvider(professional.verified, professional.acuraVolunteer),
    timezone: proTz,
    dateBlocks,
    volunteerBlocks,
    slots: slots.map((s) => ({
      dayOfWeek: s.dayOfWeek,
      startTime: s.startTime,
      endTime: s.endTime,
      slotDuration: s.slotDurationMins,
      slotGap: s.slotGapMins,
      volunteerOnly: s.volunteerOnly,
    })),
  });
}

export async function PUT(req: NextRequest) {
  const ctx = await requireProfessionalApi();
  if (isApiError(ctx)) return ctx.error;

  const rawBody = await req.json();
  const parsedBody = putAvailabilitySchema.safeParse(rawBody);
  if (!parsedBody.success) {
    return NextResponse.json({ error: parsedBody.error.flatten() }, { status: 400 });
  }

  const { slots, timezone, dateBlocks, volunteerBlocks, confirmVolunteerBlockRemoval, cancelAppointmentIds } =
    parsedBody.data;

  const professional = await db.professionalProfile.findUnique({
    where: { id: ctx.professional.id },
    select: { id: true, acuraVolunteer: true, verified: true, availability: true, timezone: true } as never,
  });
  if (!professional) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const proRow = professional as {
    id: string;
    acuraVolunteer: boolean;
    verified: boolean;
    availability?: unknown;
    timezone?: string;
  };

  if (timezone !== undefined) {
    if (typeof timezone !== "string" || !isValidIanaTimeZone(timezone)) {
      return NextResponse.json({ error: "INVALID_TIMEZONE" }, { status: 400 });
    }
    await db.professionalProfile.update({
      where: { id: proRow.id },
      data: { timezone } as never,
    });
  }

  // Merge date + volunteer blocks in one write so the second update cannot wipe the first.
  let nextAvailability = parseAvailabilityJson(proRow.availability);
  let availabilityDirty = false;

  if (dateBlocks !== undefined) {
    nextAvailability = mergeAvailabilityJson(nextAvailability, dateBlocks as DateAvailabilityBlock[]);
    availabilityDirty = true;
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

    const oldVolunteerBlocks = parseAvailabilityJson(proRow.availability).volunteerBlocks ?? [];
    const proTz = proRow.timezone ?? DEFAULT_TIME_ZONE;
    const locale = localeOf("pt");

    const conflicts = await findVolunteerBlockConflicts(
      proRow.id,
      proTz,
      oldVolunteerBlocks,
      normalizedVolunteer,
      locale,
    );

    if (conflicts.length > 0) {
      if (!confirmVolunteerBlockRemoval) {
        return NextResponse.json(
          { error: "VOLUNTEER_BLOCK_CONFLICT", conflicts },
          { status: 409 },
        );
      }

      const expectedIds = conflicts.map((c) => c.appointmentId).sort();
      const providedIds = [...(cancelAppointmentIds ?? [])].sort();
      const idsMatch =
        expectedIds.length === providedIds.length &&
        expectedIds.every((id, i) => id === providedIds[i]);

      if (!idsMatch) {
        return NextResponse.json(
          { error: "VOLUNTEER_BLOCK_CANCEL_MISMATCH", conflicts },
          { status: 400 },
        );
      }

      try {
        await cancelVolunteerBlockConflicts(proRow.id, ctx.userId, expectedIds);
      } catch (e) {
        if (e instanceof Error && e.message === "VOLUNTEER_BLOCK_CANCEL_MISMATCH") {
          return NextResponse.json({ error: "VOLUNTEER_BLOCK_CANCEL_MISMATCH" }, { status: 400 });
        }
        throw e;
      }
    }

    const currentPaid = await db.availabilitySlot.findMany({
      where: { professionalId: proRow.id, isActive: true },
      select: { dayOfWeek: true, startTime: true, endTime: true },
    });
    const incomingPaid = slots
      ? slots.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        }))
      : currentPaid.map((s) => ({
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
        }));

    const overlapKey = validatePaidVolunteerOverlap(incomingPaid, normalizedVolunteer);
    if (overlapKey) {
      return NextResponse.json({ error: overlapKey }, { status: 400 });
    }

    nextAvailability = mergeVolunteerBlocksJson(nextAvailability, normalizedVolunteer);
    availabilityDirty = true;
  }

  if (availabilityDirty) {
    await db.professionalProfile.update({
      where: { id: proRow.id },
      data: { availability: nextAvailability } as never,
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
    volunteerOnly: !!s.volunteerOnly,
  }));

  const validationError = validateAvailabilityBlocks(normalized);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  const parsedAvail = parseAvailabilityJson(proRow.availability);
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

  const hasVolunteerBlocks = normalized.some((s) => s.volunteerOnly);
  if (hasVolunteerBlocks && !isAcuraVolunteerProvider(proRow.verified, proRow.acuraVolunteer)) {
    return NextResponse.json({ error: "ACURA_VOLUNTEER_REQUIRED" }, { status: 400 });
  }

  const ops = [
    db.availabilitySlot.deleteMany({ where: { professionalId: proRow.id } }),
  ];
  if (normalized.length > 0) {
    ops.push(
      db.availabilitySlot.createMany({
        data: normalized.map((s) => ({
          professionalId: proRow.id,
          dayOfWeek: s.dayOfWeek,
          startTime: s.startTime,
          endTime: s.endTime,
          slotDurationMins: s.slotDurationMins,
          slotGapMins: s.slotGapMins,
          volunteerOnly: s.volunteerOnly,
          isActive: true,
        })),
      }),
    );
  }
  await db.$transaction(ops);

  return NextResponse.json({ ok: true });
}
