import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createNotification } from "@/lib/notifications";
import { storedNotificationText } from "@/lib/notification-i18n";
import { buildClinicalDocumentWaMeUrl, sendHumanitarianYourTurnWhatsApp } from "@/lib/whatsapp";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import type { HumanitarianCampaignReportDto } from "@/lib/humanitarian/types";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export async function buildCampaignReport(campaignId: string): Promise<HumanitarianCampaignReportDto | null> {
  const campaign = await db.humanitarianCampaign.findUnique({
    where: { id: campaignId },
    include: { pools: { orderBy: { sortOrder: "asc" } } },
  });
  if (!campaign) return null;

  const today = startOfToday();
  const pools = await Promise.all(
    campaign.pools.map(async (pool) => {
      const [
        waiting,
        volunteersOnline,
        volunteersBusy,
        completedToday,
        crisisWaiting,
      ] = await Promise.all([
        db.humanitarianQueueEntry.count({
          where: { poolId: pool.id, status: { in: ["WAITING", "CALLED"] } },
        }),
        db.humanitarianVolunteer.count({
          where: { poolId: pool.id, status: "ONLINE" },
        }),
        db.humanitarianVolunteer.count({
          where: { poolId: pool.id, status: "BUSY" },
        }),
        db.humanitarianQueueEntry.count({
          where: { poolId: pool.id, status: "DONE", endedAt: { gte: today } },
        }),
        db.humanitarianQueueEntry.count({
          where: { poolId: pool.id, status: "WAITING", priority: "CRISIS" },
        }),
      ]);

      return {
        id: pool.id,
        slug: pool.slug,
        labelEs: pool.labelEs,
        labelPt: pool.labelPt,
        labelEn: pool.labelEn,
        maxWaiting: pool.maxWaiting,
        sortOrder: pool.sortOrder,
        waiting,
        volunteersOnline,
        volunteersBusy,
        isFull: waiting >= pool.maxWaiting,
        completedToday,
        crisisWaiting,
      };
    }),
  );

  const [inConsult, completedToday, noShowsToday, volunteersOnline, volunteersBusy] =
    await Promise.all([
      db.humanitarianQueueEntry.count({
        where: { campaignId, status: "IN_PROGRESS" },
      }),
      db.humanitarianQueueEntry.count({
        where: { campaignId, status: "DONE", endedAt: { gte: today } },
      }),
      db.humanitarianQueueEntry.count({
        where: { campaignId, status: "NO_SHOW", endedAt: { gte: today } },
      }),
      db.humanitarianVolunteer.count({
        where: { campaignId, status: "ONLINE" },
      }),
      db.humanitarianVolunteer.count({
        where: { campaignId, status: "BUSY" },
      }),
    ]);

  const completedEntries = await db.humanitarianQueueEntry.findMany({
    where: {
      campaignId,
      status: "DONE",
      endedAt: { gte: today },
      startedAt: { not: null },
      enteredAt: { not: undefined },
    },
    select: { enteredAt: true, startedAt: true },
  });

  let avgWaitMinutesToday: number | null = null;
  if (completedEntries.length > 0) {
    const totalMs = completedEntries.reduce((sum, e) => {
      if (!e.startedAt) return sum;
      return sum + (e.startedAt.getTime() - e.enteredAt.getTime());
    }, 0);
    avgWaitMinutesToday = Math.round(totalMs / completedEntries.length / 60000);
  }

  return {
    campaignId: campaign.id,
    slug: campaign.slug,
    name: campaign.name,
    active: campaign.active,
    totals: {
      waiting: pools.reduce((s, p) => s + p.waiting, 0),
      inConsult,
      completedToday,
      noShowsToday,
      volunteersOnline,
      volunteersBusy,
      avgWaitMinutesToday,
    },
    pools,
  };
}

export async function getActiveCampaignForRegion(region: string | null | undefined) {
  const campaign = await db.humanitarianCampaign.findFirst({
    where: {
      active: true,
      ...(region === "VE" ? { OR: [{ region: "VE" }, { region: null }] } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  if (campaign) return campaign;

  if (region === "VE") {
    const fallback = await db.humanitarianCampaign.findUnique({
      where: { slug: VENEZUELA_CAMPAIGN_SLUG },
    });
    return fallback?.active ? fallback : null;
  }

  return null;
}

export async function getPatientActiveHumanitarianEntry(patientUserId: string) {
  return db.humanitarianQueueEntry.findFirst({
    where: {
      patientUserId,
      status: { in: ["WAITING", "CALLED", "IN_PROGRESS"] },
      pool: { campaign: { active: true } },
    },
    include: {
      pool: {
        include: { campaign: { select: { slug: true, name: true } } },
      },
    },
    orderBy: { enteredAt: "desc" },
  });
}

export async function resolvePatientPhone(userId: string): Promise<string | null> {
  const profile = await db.patientProfile.findUnique({
    where: { userId },
    select: { phone: true },
  });
  if (!profile?.phone) return null;
  const phone = safeDecrypt(profile.phone);
  return phone || null;
}

export async function notifyHumanitarianJoined(opts: {
  patientUserId: string;
  poolLabel: string;
  position: number;
  campaignSlug: string;
}) {
  const copy = storedNotificationText("hum.notif.joined.title", "hum.notif.joined.body", {
    pool: opts.poolLabel,
    position: opts.position,
  });
  await createNotification({
    userId: opts.patientUserId,
    title: copy.title,
    body: copy.body,
    type: "system",
    data: {
      link: `/humanitarian/${opts.campaignSlug}`,
      titleKey: "hum.notif.joined.title",
      bodyKey: "hum.notif.joined.body",
      bodyParams: { pool: opts.poolLabel, position: opts.position },
    },
  }).catch(() => {});
}

export async function notifyHumanitarianYourTurn(opts: {
  patientUserId: string;
  entryId: string;
  campaignSlug: string;
  professionalName?: string | null;
  noShowTimeoutSeconds?: number;
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.org";
  const entryUrl = `${appUrl}/humanitarian/${opts.campaignSlug}`;
  const videoPath = `/video/humanitarian/${opts.entryId}`;

  const phone = await resolvePatientPhone(opts.patientUserId);
  const profile = await db.patientProfile.findUnique({
    where: { userId: opts.patientUserId },
    select: { firstName: true },
  });
  const user = await db.user.findUnique({
    where: { id: opts.patientUserId },
    select: { language: true },
  });
  const firstName = profile ? safeDecrypt(profile.firstName) : "paciente";
  const pro = opts.professionalName || "un profesional voluntario";
  const waitMins = Math.max(1, Math.ceil((opts.noShowTimeoutSeconds ?? 180) / 60));
  const waMessage =
    `Hola ${firstName}, es tu turno en Doctor8 (atención humanitaria). ` +
    `${pro} está listo para atenderte. Entra aquí: ${entryUrl} — Tienes ${waitMins} minutos.`;
  let whatsappUrl = phone ? buildClinicalDocumentWaMeUrl(phone, waMessage) : null;

  if (phone) {
    const wa = await sendHumanitarianYourTurnWhatsApp({
      toPhone: phone,
      patientFirstName: firstName,
      professionalName: pro,
      entryUrl,
      language: (user?.language as "pt" | "en" | "es") ?? "es",
    });
    if (wa.ok) whatsappUrl = null;
    else if (wa.waMeUrl) whatsappUrl = wa.waMeUrl;
  }

  const turnCopy = storedNotificationText("hum.notif.yourTurn.title", "hum.notif.yourTurn.body", {
    professional: pro,
  });
  await createNotification({
    userId: opts.patientUserId,
    title: turnCopy.title,
    body: turnCopy.body,
    type: "message",
    data: {
      entryId: opts.entryId,
      link: videoPath,
      url: videoPath,
      whatsappUrl: whatsappUrl ?? undefined,
      titleKey: "hum.notif.yourTurn.title",
      bodyKey: "hum.notif.yourTurn.body",
      bodyParams: { professional: pro },
    },
  }).catch(() => {});
}

export async function notifyHumanitarianMissedTurn(patientUserId: string, campaignSlug: string) {
  const missedCopy = storedNotificationText("hum.notif.missed.title", "hum.notif.missed.body");
  await createNotification({
    userId: patientUserId,
    title: missedCopy.title,
    body: missedCopy.body,
    type: "system",
    data: {
      link: `/humanitarian/${campaignSlug}`,
      titleKey: "hum.notif.missed.title",
      bodyKey: "hum.notif.missed.body",
    },
  }).catch(() => {});
}

export async function notifyVolunteerAssigned(opts: {
  volunteerUserId: string;
  entryId: string;
  patientName: string;
  chiefComplaint?: string | null;
  triageFlags?: string[];
  priority?: string | null;
}) {
  const flags = opts.triageFlags?.length
    ? ` Prioridade: ${opts.priority || "ROUTINE"}. Flags: ${opts.triageFlags.join(", ")}.`
    : "";
  const assignedCopy = storedNotificationText(
    "hum.notif.volunteerAssigned.title",
    "hum.notif.volunteerAssigned.body",
    { patient: opts.patientName },
  );
  await createNotification({
    userId: opts.volunteerUserId,
    title: assignedCopy.title,
    body: assignedCopy.body + flags,
    type: "system",
    data: {
      entryId: opts.entryId,
      link: "/humanitarian/volunteer",
      titleKey: "hum.notif.volunteerAssigned.title",
      bodyKey: "hum.notif.volunteerAssigned.body",
      bodyParams: { patient: opts.patientName },
    },
  }).catch(() => {});
}

export async function notifyHumanitarianAnamneseReminder(opts: {
  patientUserId: string;
  campaignSlug: string;
}) {
  const anamneseCopy = storedNotificationText("hum.notif.anamnese.title", "hum.notif.anamnese.body");
  await createNotification({
    userId: opts.patientUserId,
    title: anamneseCopy.title,
    body: anamneseCopy.body,
    type: "system",
    data: {
      link: `/humanitarian/${opts.campaignSlug}/anamnese`,
      titleKey: "hum.notif.anamnese.title",
      bodyKey: "hum.notif.anamnese.body",
    },
  }).catch(() => {});
}

export async function notifyHumanitarianWhatsAppHandoff(opts: {
  patientUserId: string;
  campaignSlug: string;
  volunteerName: string;
}) {
  const handoffCopy = storedNotificationText(
    "hum.notif.whatsappHandoff.title",
    "hum.notif.whatsappHandoff.body",
    { professional: opts.volunteerName },
  );
  await createNotification({
    userId: opts.patientUserId,
    title: handoffCopy.title,
    body: handoffCopy.body,
    type: "system",
    data: {
      link: `/humanitarian/${opts.campaignSlug}`,
      titleKey: "hum.notif.whatsappHandoff.title",
      bodyKey: "hum.notif.whatsappHandoff.body",
      bodyParams: { professional: opts.volunteerName },
    },
  }).catch(() => {});
}

export async function notifyHumanitarianMeetHandoff(opts: {
  patientUserId: string;
  campaignSlug: string;
  volunteerName: string;
  meetUrl: string;
}) {
  const handoffCopy = storedNotificationText(
    "hum.notif.meetHandoff.title",
    "hum.notif.meetHandoff.body",
    { professional: opts.volunteerName },
  );
  await createNotification({
    userId: opts.patientUserId,
    title: handoffCopy.title,
    body: handoffCopy.body,
    type: "system",
    data: {
      link: `/humanitarian/${opts.campaignSlug}`,
      titleKey: "hum.notif.meetHandoff.title",
      bodyKey: "hum.notif.meetHandoff.body",
      bodyParams: { professional: opts.volunteerName },
      meetUrl: opts.meetUrl,
    },
  }).catch(() => {});
}
