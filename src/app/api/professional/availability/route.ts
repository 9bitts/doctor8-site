// src/app/api/professional/availability/route.ts

import { NextRequest, NextResponse } from "next/server";
import { requireProfessionalApi, isApiError } from "@/lib/api-auth";
import { db } from "@/lib/db";
import { validateAvailabilityBlocks } from "@/lib/availability-validation";
import { isAcuraVolunteerProvider } from "@/lib/acura-volunteer";
import { isValidIanaTimeZone, DEFAULT_TIME_ZONE } from "@/lib/timezone";
import {
  mergeAvailabilityJson,
  parseAvailabilityJson,
  type DateAvailabilityBlock,
} from "@/lib/availability-exceptions";

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
  const dateBlocks = parseAvailabilityJson(professional.availability).dateBlocks ?? [];

  const slots = await db.availabilitySlot.findMany({
    where: { professionalId: professional.id, isActive: true },
    orderBy: [{ dayOfWeek: "asc" }, { startTime: "asc" }],
  });

  return NextResponse.json({
    acuraVolunteer: professional.acuraVolunteer,
    badgeVisible: isAcuraVolunteerProvider(professional.verified, professional.acuraVolunteer),
    timezone: proTz,
    dateBlocks,
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

  const { slots, timezone, dateBlocks } = await req.json();

  const professional = await db.professionalProfile.findUnique({
    where: { id: ctx.professional.id },
    select: { id: true, acuraVolunteer: true, verified: true, availability: true },
  });
  if (!professional) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (timezone !== undefined) {
    if (typeof timezone !== "string" || !isValidIanaTimeZone(timezone)) {
      return NextResponse.json({ error: "INVALID_TIMEZONE" }, { status: 400 });
    }
    await db.professionalProfile.update({
      where: { id: professional.id },
      data: { timezone } as never,
    });
  }

  if (dateBlocks !== undefined) {
    if (!Array.isArray(dateBlocks)) {
      return NextResponse.json({ error: "INVALID_DATE_BLOCKS" }, { status: 400 });
    }
    const merged = mergeAvailabilityJson(
      professional.availability,
      dateBlocks as DateAvailabilityBlock[],
    );
    await db.professionalProfile.update({
      where: { id: professional.id },
      data: { availability: merged } as never,
    });
  }

  if (!Array.isArray(slots)) {
    return NextResponse.json({ ok: true });
  }

  const normalized = (slots as {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
    slotDuration: number;
    slotGap?: number;
    volunteerOnly?: boolean;
  }[]).map((s) => ({
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

  const hasVolunteerBlocks = normalized.some((s) => s.volunteerOnly);
  if (hasVolunteerBlocks && !isAcuraVolunteerProvider(professional.verified, professional.acuraVolunteer)) {
    return NextResponse.json({ error: "ACURA_VOLUNTEER_REQUIRED" }, { status: 400 });
  }

  const ops = [
    db.availabilitySlot.deleteMany({ where: { professionalId: professional.id } }),
  ];
  if (normalized.length > 0) {
    ops.push(
      db.availabilitySlot.createMany({
        data: normalized.map((s) => ({
          professionalId: professional.id,
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
