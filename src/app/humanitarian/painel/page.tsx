import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { decryptPatientFields } from "@/lib/encryption";
import { getUserLang } from "@/lib/i18n/server-lang";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import {
  getActiveCampaignForRegion,
  getPatientActiveHumanitarianEntry,
} from "@/lib/humanitarian/notify";
import { getPatientIntakeStatusBySlug } from "@/lib/humanitarian/intake";
import { resolveHumanitarianPatientFlag } from "@/lib/humanitarian/patient-identity";
import { humanitarianCareHref } from "@/lib/humanitarian/patient-flow";
import HumanitarianPatientDashboard from "@/components/humanitarian/HumanitarianPatientDashboard";
import { HUMANITARIAN_PATIENT_LOGIN } from "@/lib/auth-portals";

export default async function HumanitarianPatientPainelPage() {
  const session = await auth();
  if (!session?.user) {
    redirect(`${HUMANITARIAN_PATIENT_LOGIN}?callbackUrl=${encodeURIComponent("/humanitarian/painel")}`);
  }
  if (session.user.role !== "PATIENT") redirect("/login");

  const userId = session.user.id;
  const isHumanitarian = await resolveHumanitarianPatientFlag(userId);
  if (!isHumanitarian) redirect("/patient");

  const lang = await getUserLang(userId);

  const patient = await db.patientProfile.findUnique({
    where: { userId },
    select: { id: true, firstName: true, lastName: true },
  });
  if (!patient) redirect("/onboarding");

  const decrypted = decryptPatientFields(
    { firstName: patient.firstName, lastName: patient.lastName },
    ["firstName", "lastName"],
  );
  const displayName = `${decrypted.firstName} ${decrypted.lastName}`.trim() || "Paciente";

  const [campaign, entry, intake, unreadMessages] = await Promise.all([
    getActiveCampaignForRegion(session.user.region),
    getPatientActiveHumanitarianEntry(userId),
    getPatientIntakeStatusBySlug(VENEZUELA_CAMPAIGN_SLUG, userId),
    db.message.count({
      where: { receiverId: userId, readAt: null, deletedAt: null },
    }),
  ]);

  const campaignSlug = campaign?.slug ?? VENEZUELA_CAMPAIGN_SLUG;
  const careHref = humanitarianCareHref(campaignSlug, {
    triageValid: intake?.triageValid ?? false,
    tcleAccepted: intake?.tcleAccepted ?? false,
  });

  return (
    <HumanitarianPatientDashboard
      lang={lang}
      displayName={displayName}
      campaign={
        campaign
          ? { slug: campaign.slug, name: campaign.name }
          : { slug: campaignSlug, name: "SOS Venezuela" }
      }
      entry={
        entry
          ? {
              id: entry.id,
              status: entry.status,
              pool: entry.pool,
            }
          : null
      }
      intake={{
        triageValid: intake?.triageValid ?? false,
        tcleAccepted: intake?.tcleAccepted ?? false,
        anamneseComplete: intake?.anamneseComplete ?? false,
      }}
      careHref={careHref}
      unreadMessages={unreadMessages}
    />
  );
}
