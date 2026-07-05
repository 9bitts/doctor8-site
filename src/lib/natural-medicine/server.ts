import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import {
  filterEnabledNaturalPractices,
  NATURAL_MEDICINE_PRACTICES,
  naturalMedicineByUrlSlug,
  type NaturalMedicinePortal,
  type NaturalMedicinePracticeConfig,
} from "./config";

export async function requireNaturalMedicinePortal(
  portal: NaturalMedicinePortal,
): Promise<{ enabledPractices: NaturalMedicinePracticeConfig[] }> {
  const session = await auth();
  if (!session?.user) redirect("/login");

  if (portal === "professional") {
    if (session.user.role !== "PROFESSIONAL") redirect("/patient");
    return { enabledPractices: NATURAL_MEDICINE_PRACTICES };
  }

  if (session.user.role !== "INTEGRATIVE_THERAPIST") redirect("/patient");

  const profile = await db.integrativeTherapistProfile.findUnique({
    where: { userId: session.user.id },
    select: { picsPractices: true },
  });
  if (!profile) redirect("/integrative-therapist/settings");

  const enabled = filterEnabledNaturalPractices(profile.picsPractices);
  if (enabled.length === 0) redirect("/integrative-therapist/settings");

  return { enabledPractices: enabled };
}

export async function requireNaturalMedicinePractice(
  portal: NaturalMedicinePortal,
  practiceUrlSlug: string,
): Promise<{
  practice: NaturalMedicinePracticeConfig;
  enabledPractices: NaturalMedicinePracticeConfig[];
}> {
  const practice = naturalMedicineByUrlSlug(practiceUrlSlug);
  if (!practice) {
    redirect(
      portal === "professional"
        ? "/professional/medicina-natural"
        : "/integrative-therapist/medicina-natural",
    );
  }

  const { enabledPractices } = await requireNaturalMedicinePortal(portal);

  if (portal === "integrative") {
    const allowed = enabledPractices.some((p) => p.urlSlug === practiceUrlSlug);
    if (!allowed) redirect("/integrative-therapist/medicina-natural");
  }

  return { practice, enabledPractices };
}
