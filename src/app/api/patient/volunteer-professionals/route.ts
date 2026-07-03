import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { parseAvailabilityJson } from "@/lib/availability-exceptions";
import { getProviderAvailableDays } from "@/lib/availability-slots";
import { filterDaysForScheduledVolunteerBooking } from "@/lib/appointment-slots";
import { normalizeLang, localeOf } from "@/lib/i18n/translations";
import { formatAppointmentTimeWithLabel, DEFAULT_TIME_ZONE } from "@/lib/timezone";
import { PSYCHOANALYSIS_SPECIALTY } from "@/lib/providers";
import { safeDecrypt } from "@/lib/psychoanalyst-api";
import {
  isVolunteerScheduledApproved,
  isVolunteerScheduledApprovalRequired,
} from "@/lib/volunteer-scheduled-approval";

export type VolunteerProfessionalListItem = {
  id: string;
  providerType: "health" | "psychoanalyst" | "integrative";
  professionalUserId: string;
  firstName: string;
  lastName: string;
  specialty: string;
  avatarUrl: string | null;
  bio: string | null;
  acceptsTeleconsult: boolean;
  acceptsInPerson: boolean;
  upcomingSlots: { datetime: string; timeLabel: string }[];
};

async function enrichProvider(
  id: string,
  providerType: VolunteerProfessionalListItem["providerType"],
  professionalUserId: string,
  base: Omit<VolunteerProfessionalListItem, "upcomingSlots" | "professionalUserId">,
  patientTz: string,
  locale: string,
): Promise<VolunteerProfessionalListItem | null> {
  const rawDays = await getProviderAvailableDays(id, providerType, locale, 14, null, {
    slotMode: "volunteer",
  });
  const days = filterDaysForScheduledVolunteerBooking(rawDays);
  const upcomingSlots = days
    .flatMap((day) => day.slots)
    .slice(0, 6)
    .map((slot) => ({
      datetime: slot.datetime,
      timeLabel: formatAppointmentTimeWithLabel(new Date(slot.datetime), patientTz, locale),
    }));

  if (upcomingSlots.length === 0) return null;

  return { ...base, professionalUserId, upcomingSlots };
}

export async function GET(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const lang = normalizeLang(req.nextUrl.searchParams.get("lang"));
  const locale = localeOf(lang);

  const patientUser = await db.user.findUnique({
    where: { id: ctx.userId },
    select: { timezone: true } as never,
  });
  const patientTz =
    (patientUser as { timezone?: string } | null)?.timezone || DEFAULT_TIME_ZONE;

  const approvalRequired = isVolunteerScheduledApprovalRequired();

  const [professionals, psychoanalysts, integrativeTherapists] = await Promise.all([
    db.professionalProfile.findMany({
      where: { verified: true },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        specialty: true,
        avatarUrl: true,
        bio: true,
        availability: true,
        acceptsTeleconsult: true,
        acceptsInPerson: true,
        volunteerScheduledApproved: true,
        availabilitySlots: {
          where: { isActive: true, volunteerOnly: true },
          select: { id: true },
          take: 1,
        },
      } as never,
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.psychoanalystProfile.findMany({
      where: { verified: true },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        bio: true,
        avatarUrl: true,
        acceptsTeleconsult: true,
        acceptsInPerson: true,
        availabilitySlots: {
          where: { isActive: true, volunteerOnly: true },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
    db.integrativeTherapistProfile.findMany({
      where: { verified: true },
      select: {
        id: true,
        userId: true,
        firstName: true,
        lastName: true,
        bio: true,
        avatarUrl: true,
        acceptsTeleconsult: true,
        acceptsInPerson: true,
        availability: true,
        availabilitySlots: { where: { isActive: true }, select: { id: true }, take: 1 },
      },
      orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
    }),
  ]);

  const healthCandidates = (professionals as Array<{
    id: string;
    userId: string;
    firstName: string;
    lastName: string;
    specialty: string;
    avatarUrl: string | null;
    bio: string | null;
    availability: unknown;
    acceptsTeleconsult: boolean;
    acceptsInPerson: boolean;
    volunteerScheduledApproved: boolean;
    availabilitySlots: { id: string }[];
  }>).filter((pro) => {
    const blocks = parseAvailabilityJson(pro.availability).volunteerBlocks ?? [];
    const hasBlocks = blocks.length > 0 || pro.availabilitySlots.length > 0;
    if (!hasBlocks) return false;
    return isVolunteerScheduledApproved("health", {
      verified: true,
      volunteerScheduledApproved: pro.volunteerScheduledApproved,
    });
  });

  const psychoCandidates = psychoanalysts.filter(
    (p) => p.availabilitySlots.length > 0,
  );

  const integrativeCandidates = integrativeTherapists.filter((t) => {
    const blocks = parseAvailabilityJson(t.availability).volunteerBlocks ?? [];
    return blocks.length > 0;
  });

  const enriched = (
    await Promise.all([
      ...healthCandidates.map((pro) =>
        enrichProvider(
          pro.id,
          "health",
          pro.userId,
          {
            id: pro.id,
            providerType: "health",
            firstName: pro.firstName,
            lastName: pro.lastName,
            specialty: pro.specialty,
            avatarUrl: pro.avatarUrl,
            bio: pro.bio,
            acceptsTeleconsult: pro.acceptsTeleconsult,
            acceptsInPerson: pro.acceptsInPerson,
          },
          patientTz,
          locale,
        ),
      ),
      ...psychoCandidates.map((pro) =>
        enrichProvider(
          pro.id,
          "psychoanalyst",
          pro.userId,
          {
            id: pro.id,
            providerType: "psychoanalyst",
            firstName: safeDecrypt(pro.firstName),
            lastName: safeDecrypt(pro.lastName),
            specialty: PSYCHOANALYSIS_SPECIALTY,
            avatarUrl: pro.avatarUrl,
            bio: pro.bio,
            acceptsTeleconsult: pro.acceptsTeleconsult,
            acceptsInPerson: pro.acceptsInPerson,
          },
          patientTz,
          locale,
        ),
      ),
      ...integrativeCandidates.map((pro) =>
        enrichProvider(
          pro.id,
          "integrative",
          pro.userId,
          {
            id: pro.id,
            providerType: "integrative",
            firstName: pro.firstName,
            lastName: pro.lastName,
            specialty: "Terapia integrativa",
            avatarUrl: pro.avatarUrl,
            bio: pro.bio,
            acceptsTeleconsult: pro.acceptsTeleconsult,
            acceptsInPerson: pro.acceptsInPerson,
          },
          patientTz,
          locale,
        ),
      ),
    ])
  ).filter((p): p is VolunteerProfessionalListItem => p != null);

  return NextResponse.json({
    professionals: enriched,
    approvalRequired,
  });
}
