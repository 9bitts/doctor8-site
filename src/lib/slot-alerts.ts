// Notify subscribers when a consultation slot becomes available.

import { db } from "@/lib/db";
import { sendSlotAvailableAlert } from "@/lib/email";
import { buildPublicProfileUrl } from "@/lib/public-slugs";
import { safeDecrypt } from "@/lib/psychoanalyst-api";

const ALERT_COOLDOWN_MS = 24 * 60 * 60 * 1000;

export async function notifySlotAlerts(opts: {
  professionalId?: string | null;
  psychoanalystId?: string | null;
  freedAt: Date;
}): Promise<void> {
  const { professionalId, psychoanalystId, freedAt } = opts;

  if (freedAt.getTime() <= Date.now()) return;

  const alerts = professionalId
    ? await db.slotAvailabilityAlert.findMany({
        where: { professionalId, active: true },
      })
    : psychoanalystId
      ? await db.slotAvailabilityAlert.findMany({
          where: { psychoanalystId, active: true },
        })
      : [];

  if (alerts.length === 0) return;

  const card = await db.virtualCard.findFirst({
    where: professionalId ? { professionalId } : { psychoanalystId: psychoanalystId! },
    include: {
      professional: { select: { firstName: true, lastName: true } },
      psychoanalyst: { select: { firstName: true, lastName: true } },
    },
  });
  if (!card) return;

  const providerName = card.professional
    ? `${card.professional.firstName} ${card.professional.lastName}`.trim()
    : card.psychoanalyst
      ? `${safeDecrypt(card.psychoanalyst.firstName)} ${safeDecrypt(card.psychoanalyst.lastName)}`.trim()
      : "Profissional";

  const profileUrl = buildPublicProfileUrl({
    specialtySlug: card.specialtySlug,
    citySlug: card.citySlug,
    slug: card.slug,
  });

  const bookUrl = `${profileUrl}?slot=${encodeURIComponent(freedAt.toISOString())}`;
  const timeLabel = freedAt.toLocaleString("pt-BR", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });

  await Promise.allSettled(
    alerts.map(async (alert) => {
      if (alert.notifiedAt && Date.now() - alert.notifiedAt.getTime() < ALERT_COOLDOWN_MS) {
        return;
      }

      await sendSlotAvailableAlert({
        email: alert.email,
        providerName,
        timeLabel,
        bookUrl,
        language: "pt",
      });
      await db.slotAvailabilityAlert.update({
        where: { id: alert.id },
        data: { notifiedAt: new Date() },
      });
    })
  );
}
