// src/app/onboarding/page.tsx
// First-run entry point for accounts that still need a profile. Instead of a
// separate (and previously broken) onboarding form, send each role straight to
// its real profile-completion screen, which can create/complete the profile.

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";

export default async function OnboardingPage({
  searchParams,
}: {
  searchParams: Promise<{ portal?: string }>;
}) {
  const session = await auth();
  if (!session?.user) redirect("/login");

  const { portal } = await searchParams;
  const role = session.user.role;

  if (role === "PROFESSIONAL") {
    if (portal === "psychologist") redirect("/psychologist/settings");
    if (portal === "nutritionist") redirect("/nutricionista/settings");
    redirect("/professional/settings");
  }
  if (role === "PSYCHOANALYST") redirect("/psychoanalyst/settings");
  if (role === "INTEGRATIVE_THERAPIST") redirect("/integrative-therapist/settings");
  if (role === "ORGANIZATION") redirect("/organization/settings");
  if (role === "ADMIN") redirect("/admin");
  if (role === "ANGEL") redirect("/admin/patients");

  redirect("/patient/account");
}
