import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { encrypt } from "@/lib/encryption";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { resolveAngelAccess } from "@/lib/humanitarian/angel";

const followUpSchema = z.object({
  campaignSlug: z.string().optional(),
  patientUserId: z.string().min(1),
  queueEntryId: z.string().optional(),
  channel: z.enum(["WHATSAPP", "PHONE", "SMS", "OTHER"]),
  outcome: z.enum(["REACHED_OK", "NEEDS_HELP", "NO_ANSWER", "WRONG_NUMBER", "ESCALATED", "OTHER"]),
  notes: z.string().max(5000).optional(),
  needsFlags: z.array(z.string()).optional(),
  escalated: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (session.user.role !== "ANGEL") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = followUpSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const campaignSlug = parsed.data.campaignSlug || VENEZUELA_CAMPAIGN_SLUG;
  const access = await resolveAngelAccess(session.user.id, campaignSlug);
  if (!access.ok) {
    return NextResponse.json({ error: access.reason }, { status: 403 });
  }

  const intake = await db.humanitarianIntake.findUnique({
    where: {
      campaignId_patientUserId: {
        campaignId: access.campaignId,
        patientUserId: parsed.data.patientUserId,
      },
    },
    select: { angelContactConsentAt: true },
  });

  if (!intake?.angelContactConsentAt) {
    return NextResponse.json({ error: "Patient did not consent to angel contact" }, { status: 403 });
  }

  const followUp = await db.humanitarianAngelFollowUp.create({
    data: {
      campaignId: access.campaignId,
      patientUserId: parsed.data.patientUserId,
      angelUserId: session.user.id,
      queueEntryId: parsed.data.queueEntryId || null,
      channel: parsed.data.channel,
      outcome: parsed.data.outcome,
      notes: parsed.data.notes ? encrypt(parsed.data.notes) : null,
      needsFlags: parsed.data.needsFlags ?? [],
      escalated: parsed.data.escalated ?? parsed.data.outcome === "ESCALATED",
    },
  });

  return NextResponse.json({
    followUp: {
      id: followUp.id,
      contactedAt: followUp.contactedAt.toISOString(),
    },
  });
}
