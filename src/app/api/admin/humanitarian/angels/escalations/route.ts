import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { decrypt } from "@/lib/encryption";
import { buildAngelRiskSummary } from "@/lib/humanitarian/angel-risk-summary";

function safeDecrypt(v: string | null | undefined): string {
  if (!v) return "";
  try {
    return decrypt(v);
  } catch {
    return v;
  }
}

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const rows = await db.humanitarianAngelFollowUp.findMany({
    where: {
      escalated: true,
      escalationResolvedAt: null,
    },
    orderBy: { contactedAt: "desc" },
    take: 50,
    include: {
      patientUser: {
        select: {
          patientProfile: { select: { firstName: true, lastName: true } },
        },
      },
      angelUser: {
        select: { angelProfile: { select: { firstName: true, lastName: true } } },
      },
      campaign: { select: { slug: true, name: true } },
    },
  });

  const intakeByPatient =
    rows.length > 0
      ? await db.humanitarianIntake.findMany({
          where: {
            OR: rows.map((r) => ({
              campaignId: r.campaignId,
              patientUserId: r.patientUserId,
            })),
          },
          select: {
            campaignId: true,
            patientUserId: true,
            computedPriority: true,
            triageFlags: true,
          },
        })
      : [];

  const intakeMap = new Map(
    intakeByPatient.map((i) => [`${i.campaignId}:${i.patientUserId}`, i]),
  );

  return NextResponse.json({
    escalations: rows.map((r) => {
      const pp = r.patientUser.patientProfile;
      const patientName = pp
        ? `${safeDecrypt(pp.firstName)} ${safeDecrypt(pp.lastName)}`.trim()
        : "Paciente";
      const intake = intakeMap.get(`${r.campaignId}:${r.patientUserId}`);
      const risk = buildAngelRiskSummary(intake ?? null, "pt");
      const angelName = r.angelUser.angelProfile
        ? `${r.angelUser.angelProfile.firstName} ${r.angelUser.angelProfile.lastName}`.trim()
        : "Anjo";

      return {
        id: r.id,
        patientUserId: r.patientUserId,
        patientName,
        priority: risk.priority,
        triageFlagLabels: risk.triageFlagLabels,
        angelName,
        contactedAt: r.contactedAt.toISOString(),
        campaignSlug: r.campaign.slug,
        campaignName: r.campaign.name,
      };
    }),
  });
}

const resolveSchema = z.object({
  followUpId: z.string().min(1),
});

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = resolveSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const row = await db.humanitarianAngelFollowUp.findUnique({
    where: { id: parsed.data.followUpId },
    select: { id: true, escalated: true, escalationResolvedAt: true },
  });

  if (!row || !row.escalated) {
    return NextResponse.json({ error: "Escalation not found" }, { status: 404 });
  }

  if (row.escalationResolvedAt) {
    return NextResponse.json({ success: true, alreadyResolved: true });
  }

  await db.humanitarianAngelFollowUp.update({
    where: { id: row.id },
    data: { escalationResolvedAt: new Date() },
  });

  return NextResponse.json({ success: true });
}
