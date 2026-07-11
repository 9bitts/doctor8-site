import { db } from "@/lib/db";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { sendHumanitarianVolunteerOnlineAlertEmail } from "@/lib/email";

export async function getVolunteerOnlineAlertStatus(
  userId: string,
  campaignId: string,
): Promise<boolean> {
  const row = await db.humanitarianVolunteerOnlineAlert.findUnique({
    where: { campaignId_userId: { campaignId, userId } },
    select: { active: true },
  });
  return row?.active ?? false;
}

export async function setVolunteerOnlineAlert(
  userId: string,
  campaignId: string,
  active: boolean,
): Promise<void> {
  await db.humanitarianVolunteerOnlineAlert.upsert({
    where: { campaignId_userId: { campaignId, userId } },
    create: { campaignId, userId, active, lastNotifiedAt: null },
    update: {
      active,
      ...(active ? { lastNotifiedAt: null } : {}),
    },
  });
}

/** Notify subscribers when the campaign goes from zero to at least one active volunteer. */
export async function notifyVolunteerOnlineAlertSubscribers(
  campaignId: string,
  campaignSlug: string,
): Promise<number> {
  const alerts = await db.humanitarianVolunteerOnlineAlert.findMany({
    where: { campaignId, active: true },
    select: { id: true, userId: true },
  });

  if (alerts.length === 0) return 0;

  const activeQueueUserIds = new Set(
    (
      await db.humanitarianQueueEntry.findMany({
        where: {
          campaignId,
          status: { in: ["WAITING", "CALLED", "IN_PROGRESS"] },
        },
        select: { patientUserId: true },
      })
    ).map((e) => e.patientUserId),
  );

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.org";
  const queueUrl = `${appUrl}/humanitarian/${campaignSlug}`;
  let notified = 0;

  for (const alert of alerts) {
    if (activeQueueUserIds.has(alert.userId)) continue;

    const copy = storedNotificationText(
      "hum.notif.volunteerOnline.title",
      "hum.notif.volunteerOnline.body",
      {},
    );

    await createNotification({
      userId: alert.userId,
      title: copy.title,
      body: copy.body,
      type: "system",
      data: {
        link: `/humanitarian/${campaignSlug}`,
        titleKey: "hum.notif.volunteerOnline.title",
        bodyKey: "hum.notif.volunteerOnline.body",
        kind: "humanitarian_volunteer_online",
        campaignSlug,
      },
    }).catch(() => {});

    try {
      const user = await db.user.findUnique({
        where: { id: alert.userId },
        select: { email: true, language: true },
      });
      if (user?.email) {
        await sendHumanitarianVolunteerOnlineAlertEmail({
          email: user.email,
          queueUrl,
          language: user.language ?? undefined,
        });
      }
    } catch (e) {
      console.error("[VOLUNTEER-ONLINE-ALERT EMAIL]", alert.userId, e);
    }

    await db.humanitarianVolunteerOnlineAlert.update({
      where: { id: alert.id },
      data: { lastNotifiedAt: new Date(), active: false },
    });
    notified += 1;
  }

  return notified;
}

export async function countActiveHumanitarianVolunteers(campaignId: string): Promise<number> {
  return db.humanitarianVolunteer.count({
    where: { campaignId, status: { in: ["ONLINE", "BUSY"] } },
  });
}
