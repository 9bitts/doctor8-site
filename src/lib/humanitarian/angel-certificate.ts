import { randomBytes } from "crypto";
import { db } from "@/lib/db";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import { angelCertMinMinutes } from "@/lib/humanitarian/angel-impact";

function generateVerifyCode(): string {
  return `A8-${randomBytes(5).toString("hex").toUpperCase()}`;
}

export async function issueAngelVolunteerCertificate(
  userId: string,
  campaignSlug = VENEZUELA_CAMPAIGN_SLUG,
): Promise<{ verifyCode: string; created: boolean } | { error: string }> {
  const profile = await db.angelProfile.findUnique({
    where: { userId },
    include: {
      volunteerCertificate: true,
      trackEnrollments: { where: { status: "APPROVED" } },
    },
  });
  if (!profile) return { error: "PROFILE_NOT_FOUND" };
  if (profile.volunteerCertificate) {
    return { verifyCode: profile.volunteerCertificate.verifyCode, created: false };
  }

  const [minutesAgg, period] = await Promise.all([
    db.angelHourLog.aggregate({
      where: { profileId: profile.id },
      _sum: { minutes: true },
    }),
    db.angelHourLog.aggregate({
      where: { profileId: profile.id },
      _min: { occurredAt: true },
      _max: { occurredAt: true },
    }),
  ]);

  const totalMinutes = minutesAgg._sum.minutes ?? 0;
  if (totalMinutes < angelCertMinMinutes()) {
    return { error: "INSUFFICIENT_HOURS" };
  }

  const campaign = await db.humanitarianCampaign.findUnique({
    where: { slug: campaignSlug },
    select: { name: true },
  });

  const volunteerName = `${profile.firstName} ${profile.lastName}`.trim();
  const tracks = profile.trackEnrollments.map((e) => e.track);

  let verifyCode = generateVerifyCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const cert = await db.angelVolunteerCertificate.create({
        data: {
          profileId: profile.id,
          verifyCode,
          volunteerName,
          campaignName: campaign?.name ?? "Doctor8 Humanitário",
          tracks,
          totalMinutes,
          periodStart: period._min.occurredAt,
          periodEnd: period._max.occurredAt,
        },
      });
      return { verifyCode: cert.verifyCode, created: true };
    } catch (e) {
      const isUnique =
        e && typeof e === "object" && "code" in e && (e as { code: string }).code === "P2002";
      if (!isUnique) throw e;
      verifyCode = generateVerifyCode();
    }
  }
  throw new Error("Failed to generate unique angel certificate code");
}

export async function getAngelCertificateByCode(verifyCode: string) {
  const normalized = verifyCode.trim().toUpperCase();
  return db.angelVolunteerCertificate.findUnique({
    where: { verifyCode: normalized },
    select: {
      verifyCode: true,
      volunteerName: true,
      campaignName: true,
      tracks: true,
      totalMinutes: true,
      periodStart: true,
      periodEnd: true,
      issuedAt: true,
    },
  });
}
