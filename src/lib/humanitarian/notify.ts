import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { createNotification } from "@/lib/notifications";
import { buildClinicalDocumentWaMeUrl } from "@/lib/whatsapp";
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
  await createNotification({
    userId: opts.patientUserId,
    title: "Estás en la fila humanitaria",
    body: `${opts.poolLabel} — posición ${opts.position}. Te avisaremos cuando sea tu turno.`,
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
}) {
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || "https://doctor8.org";
  const entryUrl = `${appUrl}/humanitarian/${opts.campaignSlug}`;
  const videoPath = `/video/humanitarian/${opts.entryId}`;

  const phone = await resolvePatientPhone(opts.patientUserId);
  const profile = await db.patientProfile.findUnique({
    where: { userId: opts.patientUserId },
    select: { firstName: true },
  });
  const firstName = profile ? safeDecrypt(profile.firstName) : "paciente";
  const pro = opts.professionalName || "un profesional voluntario";
  const waMessage =
    `Hola ${firstName}, es tu turno en Doctor8 (atención humanitaria). ` +
    `${pro} está listo para atenderte. Entra aquí: ${entryUrl} — Tienes 3 minutos.`;
  const whatsappUrl = phone ? buildClinicalDocumentWaMeUrl(phone, waMessage) : null;

  await createNotification({
    userId: opts.patientUserId,
    title: "¡Es tu turno!",
    body: `${pro} está listo. Tienes 3 minutos para entrar a la consulta gratuita.`,
    type: "message",
    data: {
      entryId: opts.entryId,
      link: videoPath,
      whatsappUrl: whatsappUrl ?? undefined,
      titleKey: "hum.notif.yourTurn.title",
      bodyKey: "hum.notif.yourTurn.body",
      bodyParams: { professional: pro },
    },
  }).catch(() => {});
}

export async function notifyHumanitarianMissedTurn(patientUserId: string, campaignSlug: string) {
  await createNotification({
    userId: patientUserId,
    title: "Perdiste tu turno",
    body: "No entraste a tiempo. Si aún necesitas atención, vuelve a unirte a la fila.",
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
}) {
  await createNotification({
    userId: opts.volunteerUserId,
    title: "Paciente asignado",
    body: `${opts.patientName} fue asignado a tu consulta humanitaria.`,
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
