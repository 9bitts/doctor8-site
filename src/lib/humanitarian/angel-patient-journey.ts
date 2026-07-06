import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";
import { getPatientIntakeStatus } from "@/lib/humanitarian/intake";
import { isHumanitarianPhoneGateEnabled } from "@/lib/humanitarian/feature-flags";
import {
  humanitarianFlowStep,
  type HumanitarianFlowStep,
} from "@/lib/humanitarian/patient-flow";
import type { Lang } from "@/lib/i18n/translations";
import type {
  AppointmentStatus,
  HumanitarianQueueStatus,
  HumanitarianVolunteer,
} from "@prisma/client";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v ?? "";
  }
}

type VolunteerWithProfiles = Pick<HumanitarianVolunteer, "providerType"> & {
  professional: { firstName: string; lastName: string } | null;
  psychoanalyst: { firstName: string; lastName: string } | null;
  integrativeTherapist: { firstName: string; lastName: string } | null;
};

export function volunteerDisplayName(
  volunteer: VolunteerWithProfiles | null | undefined,
): string | null {
  if (!volunteer) return null;
  if (volunteer.professional) {
    return `Dr. ${volunteer.professional.firstName} ${volunteer.professional.lastName}`.trim();
  }
  if (volunteer.psychoanalyst) {
    return `${volunteer.psychoanalyst.firstName} ${volunteer.psychoanalyst.lastName}`.trim();
  }
  if (volunteer.integrativeTherapist) {
    return `${volunteer.integrativeTherapist.firstName} ${volunteer.integrativeTherapist.lastName}`.trim();
  }
  return null;
}

export type AngelConsultationRow = {
  id: string;
  poolSlug: string;
  poolLabel: string;
  priority: string;
  status: HumanitarianQueueStatus;
  professionalName: string | null;
  enteredAt: string;
  startedAt: string | null;
  endedAt: string | null;
};

export type AngelReferralRow = {
  id: string;
  createdAt: string;
  specialty: string;
  fromDoctor: string | null;
  targetDoctor: string | null;
};

export type AngelAppointmentRow = {
  id: string;
  scheduledAt: string;
  status: AppointmentStatus;
  type: string;
  providerName: string;
  specialty: string | null;
};

export type AngelPatientFlow = {
  currentStep: HumanitarianFlowStep;
  intakeStatus: string | null;
  triageComplete: boolean;
  tcleComplete: boolean;
  anamneseComplete: boolean;
  activeQueueStatus: HumanitarianQueueStatus | null;
  hasCompletedConsult: boolean;
  consultationCount: number;
  hasReferral: boolean;
  hasUpcomingAppointment: boolean;
  nextAppointmentAt: string | null;
};

export type AngelPatientJourneySummary = AngelPatientFlow;

function parseReferralTarget(content: string): string | null {
  const match = content.match(/para\s+(.+?)\s*\(/i);
  return match?.[1]?.trim() ?? null;
}

function poolLabelFor(
  pool: { labelPt: string; labelEn: string; labelEs: string },
  lang: Lang,
): string {
  if (lang === "pt") return pool.labelPt;
  if (lang === "en") return pool.labelEn;
  return pool.labelEs;
}

function appointmentProviderName(a: {
  professional: { firstName: string; lastName: string; specialty: string } | null;
  psychoanalyst: { firstName: string; lastName: string } | null;
  integrativeTherapist: { firstName: string; lastName: string } | null;
}): { name: string; specialty: string | null } {
  if (a.professional) {
    return {
      name: `Dr. ${a.professional.firstName} ${a.professional.lastName}`.trim(),
      specialty: a.professional.specialty,
    };
  }
  if (a.psychoanalyst) {
    return {
      name: `${a.psychoanalyst.firstName} ${a.psychoanalyst.lastName}`.trim(),
      specialty: "Psicanálise",
    };
  }
  if (a.integrativeTherapist) {
    return {
      name: `${a.integrativeTherapist.firstName} ${a.integrativeTherapist.lastName}`.trim(),
      specialty: "Terapia integrativa",
    };
  }
  return { name: "—", specialty: null };
}

export async function loadAngelPatientJourney(
  campaignId: string,
  patientUserId: string,
  lang: Lang,
): Promise<{
  flow: AngelPatientFlow;
  consultations: AngelConsultationRow[];
  referrals: AngelReferralRow[];
  appointments: AngelAppointmentRow[];
}> {
  const patientProfile = await db.patientProfile.findUnique({
    where: { userId: patientUserId },
    select: { id: true },
  });

  const [intakeStatus, queueEntries, referralDocs, appointments] = await Promise.all([
    getPatientIntakeStatus(campaignId, patientUserId),
    db.humanitarianQueueEntry.findMany({
      where: { campaignId, patientUserId },
      orderBy: { enteredAt: "desc" },
      include: {
        pool: { select: { slug: true, labelPt: true, labelEn: true, labelEs: true } },
        volunteer: {
          include: {
            professional: { select: { firstName: true, lastName: true } },
            psychoanalyst: { select: { firstName: true, lastName: true } },
            integrativeTherapist: { select: { firstName: true, lastName: true } },
          },
        },
      },
    }),
    patientProfile
      ? db.medicalDocument.findMany({
          where: {
            type: "REFERRAL",
            patientRecord: { linkedUserId: patientUserId },
          },
          include: {
            professional: { select: { firstName: true, lastName: true, specialty: true } },
          },
          orderBy: { createdAt: "desc" },
        })
      : Promise.resolve([]),
    patientProfile
      ? db.appointment.findMany({
          where: { patientId: patientProfile.id },
          include: {
            professional: { select: { firstName: true, lastName: true, specialty: true } },
            psychoanalyst: { select: { firstName: true, lastName: true } },
            integrativeTherapist: { select: { firstName: true, lastName: true } },
          },
          orderBy: { scheduledAt: "desc" },
          take: 20,
        })
      : Promise.resolve([]),
  ]);

  const activeEntry = queueEntries.find((e) =>
    ["WAITING", "CALLED", "IN_PROGRESS"].includes(e.status),
  );
  const doneCount = queueEntries.filter((e) => e.status === "DONE").length;
  const inQueue = Boolean(activeEntry);

  const currentStep = humanitarianFlowStep(
    {
      triageValid: intakeStatus.triageValid,
      tcleAccepted: intakeStatus.tcleAccepted,
      phoneReady: intakeStatus.phoneReady,
      anamneseComplete: intakeStatus.anamneseComplete,
    },
    inQueue,
    isHumanitarianPhoneGateEnabled(),
  );

  if (activeEntry?.status === "IN_PROGRESS") {
    // override care/waiting when consult is live
  }

  let resolvedStep = currentStep;
  if (activeEntry?.status === "IN_PROGRESS") resolvedStep = "consult";
  else if (inQueue) resolvedStep = "waiting";

  const now = Date.now();
  const upcoming = appointments
    .filter(
      (a) =>
        ["CONFIRMED", "PENDING"].includes(a.status) &&
        a.scheduledAt.getTime() >= now,
    )
    .sort((a, b) => a.scheduledAt.getTime() - b.scheduledAt.getTime());

  const flow: AngelPatientFlow = {
    currentStep: resolvedStep,
    intakeStatus: intakeStatus.status,
    triageComplete: intakeStatus.triageValid,
    tcleComplete: intakeStatus.tcleAccepted,
    anamneseComplete: intakeStatus.anamneseComplete,
    activeQueueStatus: activeEntry?.status ?? null,
    hasCompletedConsult: doneCount > 0,
    consultationCount: doneCount,
    hasReferral: referralDocs.length > 0,
    hasUpcomingAppointment: upcoming.length > 0,
    nextAppointmentAt: upcoming[0]?.scheduledAt.toISOString() ?? null,
  };

  const consultations: AngelConsultationRow[] = queueEntries.map((e) => ({
    id: e.id,
    poolSlug: e.pool.slug,
    poolLabel: poolLabelFor(e.pool, lang),
    priority: e.priority,
    status: e.status,
    professionalName: volunteerDisplayName(e.volunteer),
    enteredAt: e.enteredAt.toISOString(),
    startedAt: e.startedAt?.toISOString() ?? null,
    endedAt: e.endedAt?.toISOString() ?? null,
  }));

  const referrals: AngelReferralRow[] = referralDocs.map((doc) => {
    const title = safeDecrypt(doc.title);
    const content = safeDecrypt(doc.content);
    const specialtyFromTitle = title.replace(/^Encaminhamento\s*[—-]\s*/i, "").trim();
    const fromDoctor = doc.professional
      ? `Dr. ${doc.professional.firstName} ${doc.professional.lastName}`.trim()
      : null;
    return {
      id: doc.id,
      createdAt: doc.createdAt.toISOString(),
      specialty: specialtyFromTitle || doc.professional?.specialty || "—",
      fromDoctor,
      targetDoctor: parseReferralTarget(content),
    };
  });

  const appointmentRows: AngelAppointmentRow[] = appointments.map((a) => {
    const provider = appointmentProviderName(a);
    return {
      id: a.id,
      scheduledAt: a.scheduledAt.toISOString(),
      status: a.status,
      type: a.type,
      providerName: provider.name,
      specialty: provider.specialty,
    };
  });

  return { flow, consultations, referrals, appointments: appointmentRows };
}

export async function loadAngelPatientJourneySummaries(
  campaignId: string,
  patientUserIds: string[],
): Promise<Map<string, AngelPatientJourneySummary>> {
  if (!patientUserIds.length) return new Map();

  const uniqueIds = [...new Set(patientUserIds)];
  const profiles = await db.patientProfile.findMany({
    where: { userId: { in: uniqueIds } },
    select: { id: true, userId: true },
  });
  const profileByUser = new Map(profiles.map((p) => [p.userId, p.id]));
  const profileIds = profiles.map((p) => p.id);

  const [queueEntries, referralDocs, upcomingAppointments] = await Promise.all([
    db.humanitarianQueueEntry.findMany({
      where: { campaignId, patientUserId: { in: uniqueIds } },
      select: { patientUserId: true, status: true },
    }),
    profileIds.length
      ? db.medicalDocument.findMany({
          where: {
            type: "REFERRAL",
            patientRecord: { linkedUserId: { in: uniqueIds } },
          },
          select: {
            patientRecord: { select: { linkedUserId: true } },
          },
        })
      : Promise.resolve([]),
    profileIds.length
      ? db.appointment.findMany({
          where: {
            patientId: { in: profileIds },
            status: { in: ["CONFIRMED", "PENDING"] },
            scheduledAt: { gte: new Date() },
          },
          select: { patientId: true, scheduledAt: true },
          orderBy: { scheduledAt: "asc" },
        })
      : Promise.resolve([]),
  ]);

  const referralByUser = new Map<string, boolean>();
  for (const doc of referralDocs) {
    const userId = doc.patientRecord?.linkedUserId;
    if (userId) referralByUser.set(userId, true);
  }

  const nextApptByProfile = new Map<string, Date>();
  for (const a of upcomingAppointments) {
    if (!nextApptByProfile.has(a.patientId)) {
      nextApptByProfile.set(a.patientId, a.scheduledAt);
    }
  }

  const queueByUser = new Map<string, typeof queueEntries>();
  for (const e of queueEntries) {
    const list = queueByUser.get(e.patientUserId) ?? [];
    list.push(e);
    queueByUser.set(e.patientUserId, list);
  }

  const result = new Map<string, AngelPatientJourneySummary>();

  await Promise.all(
    uniqueIds.map(async (patientUserId) => {
      const entries = queueByUser.get(patientUserId) ?? [];
      const activeEntry = entries.find((e) =>
        ["WAITING", "CALLED", "IN_PROGRESS"].includes(e.status),
      );
      const doneCount = entries.filter((e) => e.status === "DONE").length;
      const intakeStatus = await getPatientIntakeStatus(campaignId, patientUserId);
      const inQueue = Boolean(activeEntry);

      let resolvedStep = humanitarianFlowStep(
        {
          triageValid: intakeStatus.triageValid,
          tcleAccepted: intakeStatus.tcleAccepted,
          phoneReady: intakeStatus.phoneReady,
          anamneseComplete: intakeStatus.anamneseComplete,
        },
        inQueue,
        isHumanitarianPhoneGateEnabled(),
      );
      if (activeEntry?.status === "IN_PROGRESS") resolvedStep = "consult";
      else if (inQueue) resolvedStep = "waiting";

      const profileId = profileByUser.get(patientUserId);
      const nextAppt = profileId ? nextApptByProfile.get(profileId) : undefined;

      result.set(patientUserId, {
        currentStep: resolvedStep,
        intakeStatus: intakeStatus.status,
        triageComplete: intakeStatus.triageValid,
        tcleComplete: intakeStatus.tcleAccepted,
        anamneseComplete: intakeStatus.anamneseComplete,
        activeQueueStatus: activeEntry?.status ?? null,
        hasCompletedConsult: doneCount > 0,
        consultationCount: doneCount,
        hasReferral: referralByUser.get(patientUserId) ?? false,
        hasUpcomingAppointment: Boolean(nextAppt),
        nextAppointmentAt: nextAppt?.toISOString() ?? null,
      });
    }),
  );

  return result;
}
