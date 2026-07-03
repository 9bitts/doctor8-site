import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requirePatient, isApiError } from "@/lib/api-auth";
import { parseAvailabilityJson } from "@/lib/availability-exceptions";
import { getProviderAvailableDays } from "@/lib/availability-slots";
import { filterDaysForScheduledVolunteerBooking } from "@/lib/appointment-slots";
import { normalizeLang, localeOf } from "@/lib/i18n/translations";
import { formatAppointmentTimeWithLabel, DEFAULT_TIME_ZONE } from "@/lib/timezone";

export type VolunteerProfessionalListItem = {
  id: string;
  firstName: string;
  lastName: string;
  specialty: string;
  avatarUrl: string | null;
  bio: string | null;
  acceptsTeleconsult: boolean;
  acceptsInPerson: boolean;
  upcomingSlots: { datetime: string; timeLabel: string }[];
};

export async function GET(req: NextRequest) {
  const ctx = await requirePatient();
  if (isApiError(ctx)) return ctx.error;

  const lang = normalizeLang(req.nextUrl.searchParams.get("lang"));
  const locale = localeOf(lang);

  const professionals = await db.professionalProfile.findMany({
    where: { verified: true },
    select: {
      id: true,
      firstName: true,
      lastName: true,
      specialty: true,
      avatarUrl: true,
      bio: true,
      availability: true,
      acceptsTeleconsult: true,
      acceptsInPerson: true,
      timezone: true,
    },
    orderBy: [{ lastName: "asc" }, { firstName: "asc" }],
  });

  const withBlocks = professionals.filter((pro) => {
    const blocks = parseAvailabilityJson(pro.availability).volunteerBlocks ?? [];
    return blocks.length > 0;
  });

  const enriched: VolunteerProfessionalListItem[] = await Promise.all(
    withBlocks.map(async (pro) => {
      const timeZone = pro.timezone || DEFAULT_TIME_ZONE;
      const rawDays = await getProviderAvailableDays(pro.id, "health", locale, 14, null, {
        slotMode: "volunteer",
      });
      const days = filterDaysForScheduledVolunteerBooking(rawDays);
      const upcomingSlots = days
        .flatMap((day) => day.slots)
        .slice(0, 6)
        .map((slot) => ({
          datetime: slot.datetime,
          timeLabel: formatAppointmentTimeWithLabel(new Date(slot.datetime), timeZone, locale),
        }));

      return {
        id: pro.id,
        firstName: pro.firstName,
        lastName: pro.lastName,
        specialty: pro.specialty,
        avatarUrl: pro.avatarUrl,
        bio: pro.bio,
        acceptsTeleconsult: pro.acceptsTeleconsult,
        acceptsInPerson: pro.acceptsInPerson,
        upcomingSlots,
      };
    }),
  );

  return NextResponse.json({ professionals: enriched });
}
