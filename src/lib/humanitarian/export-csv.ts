import { db } from "@/lib/db";
import { decrypt } from "@/lib/encryption";

function startOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function endOfDay(d = new Date()): Date {
  const x = new Date(d);
  x.setHours(23, 59, 59, 999);
  return x;
}

function csvEscape(v: string | number | null | undefined): string {
  if (v == null) return "";
  const s = String(v);
  if (/[",\n]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try { return decrypt(v); } catch { return v; }
}

function waitMinutes(enteredAt: Date, startedAt: Date | null): string {
  if (!startedAt) return "";
  return String(Math.round((startedAt.getTime() - enteredAt.getTime()) / 60000));
}

function consultMinutes(startedAt: Date | null, endedAt: Date | null): string {
  if (!startedAt || !endedAt) return "";
  return String(Math.round((endedAt.getTime() - startedAt.getTime()) / 60000));
}

export async function buildHumanitarianCsv(campaignSlug: string, day = new Date()): Promise<string | null> {
  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true, slug: true, name: true },
  });
  if (!campaign) return null;

  const from = startOfDay(day);
  const to = endOfDay(day);

  const entries = await db.humanitarianQueueEntry.findMany({
    where: {
      campaignId: campaign.id,
      enteredAt: { gte: from, lte: to },
    },
    include: {
      pool: { select: { slug: true, labelEs: true } },
      intake: {
        select: {
          computedPriority: true,
          triageFlags: true,
          status: true,
          forceMedicalPool: true,
        },
      },
    },
    orderBy: { enteredAt: "asc" },
  });

  const headers = [
    "entry_id",
    "pool_slug",
    "pool_label",
    "priority",
    "triage_flags",
    "intake_status",
    "force_medical_pool",
    "status",
    "entered_at",
    "called_at",
    "started_at",
    "ended_at",
    "wait_minutes",
    "consult_minutes",
  ];

  const rows = entries.map((e) =>
    [
      e.id,
      e.pool.slug,
      e.pool.labelEs,
      e.priority,
      e.intake?.triageFlags?.join(";") ?? "",
      e.intake?.status ?? "",
      e.intake?.forceMedicalPool ? "yes" : "",
      e.status,
      e.enteredAt.toISOString(),
      e.calledAt?.toISOString() ?? "",
      e.startedAt?.toISOString() ?? "",
      e.endedAt?.toISOString() ?? "",
      waitMinutes(e.enteredAt, e.startedAt),
      consultMinutes(e.startedAt, e.endedAt),
    ]
      .map(csvEscape)
      .join(","),
  );

  return [headers.join(","), ...rows].join("\n");
}

export async function buildHumanitarianIntakesCsv(campaignSlug: string): Promise<string | null> {
  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true },
  });
  if (!campaign) return null;

  const intakes = await db.humanitarianIntake.findMany({
    where: { campaignId: campaign.id },
    orderBy: { updatedAt: "desc" },
    include: {
      patientUser: {
        select: { patientProfile: { select: { firstName: true, lastName: true } } },
      },
    },
  });

  const headers = [
    "intake_id",
    "patient_label",
    "priority",
    "triage_flags",
    "intake_status",
    "force_medical_pool",
    "service_types",
    "triage_completed_at",
    "consent_at",
    "updated_at",
  ];

  const rows = intakes.map((i) => {
    const p = i.patientUser.patientProfile;
    const label = p
      ? `${safeDecrypt(p.firstName)} ${safeDecrypt(p.lastName)}`.trim()
      : "Paciente";
    return [
      i.id,
      label,
      i.computedPriority ?? "",
      i.triageFlags.join(";"),
      i.status,
      i.forceMedicalPool ? "yes" : "",
      i.serviceTypes.join(";"),
      i.triageCompletedAt?.toISOString() ?? "",
      i.consentAt?.toISOString() ?? "",
      i.updatedAt.toISOString(),
    ]
      .map(csvEscape)
      .join(",");
  });

  return [headers.join(","), ...rows].join("\n");
}
