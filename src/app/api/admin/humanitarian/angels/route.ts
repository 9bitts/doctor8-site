import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { z } from "zod";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

const patchSchema = z.object({
  userId: z.string(),
  action: z.enum(["approve", "reject"]),
  rejectionReason: z.string().max(500).optional(),
  campaignSlug: z.string().optional(),
});

export async function GET() {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const angels = await db.angelProfile.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      user: {
        select: {
          id: true,
          email: true,
          emailVerified: true,
          region: true,
          language: true,
          createdAt: true,
          _count: { select: { providerLicenseDocuments: true } },
        },
      },
    },
  });

  return NextResponse.json({
    angels: angels.map((a) => ({
      id: a.id,
      userId: a.userId,
      firstName: a.firstName,
      lastName: a.lastName,
      profession: a.profession,
      volunteerHelp: a.volunteerHelp,
      languages: a.languages,
      motivation: a.motivation,
      preferredCampaignSlug: a.preferredCampaignSlug,
      approvalStatus: a.approvalStatus,
      approvedAt: a.approvedAt?.toISOString() ?? null,
      rejectionReason: a.rejectionReason,
      email: a.user.email,
      emailVerified: !!a.user.emailVerified,
      region: a.user.region,
      licenseDocCount: a.user._count.providerLicenseDocuments,
      hasPhone: Boolean(a.phone),
      createdAt: a.createdAt.toISOString(),
    })),
  });
}

export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const parsed = patchSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 });
  }

  const profile = await db.angelProfile.findFirst({
    where: { userId: parsed.data.userId },
  });
  if (!profile) {
    return NextResponse.json({ error: "Angel not found" }, { status: 404 });
  }

  if (parsed.data.action === "reject") {
    await db.angelProfile.update({
      where: { id: profile.id },
      data: {
        approvalStatus: "REJECTED",
        rejectionReason: parsed.data.rejectionReason || null,
        approvedAt: null,
        approvedById: null,
      },
    });
    return NextResponse.json({ success: true, status: "REJECTED" });
  }

  const user = await db.user.findUnique({
    where: { id: parsed.data.userId },
    select: { emailVerified: true },
  });
  if (!user?.emailVerified) {
    return NextResponse.json(
      { error: "Email must be verified before approval" },
      { status: 400 },
    );
  }

  const campaignSlug = parsed.data.campaignSlug || profile.preferredCampaignSlug || VENEZUELA_CAMPAIGN_SLUG;
  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { id: true },
  });
  if (!campaign) {
    return NextResponse.json({ error: "Campaign not found" }, { status: 404 });
  }

  await db.$transaction(async (tx) => {
    await tx.angelProfile.update({
      where: { id: profile.id },
      data: {
        approvalStatus: "APPROVED",
        approvedAt: new Date(),
        approvedById: session.user!.id,
        rejectionReason: null,
      },
    });

    await tx.humanitarianAngel.upsert({
      where: {
        campaignId_userId: { campaignId: campaign.id, userId: parsed.data.userId },
      },
      create: {
        campaignId: campaign.id,
        userId: parsed.data.userId,
        active: true,
      },
      update: { active: true },
    });
  });

  return NextResponse.json({ success: true, status: "APPROVED" });
}
