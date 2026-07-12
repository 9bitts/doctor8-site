import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { isDentistSpecialty } from "@/lib/profession-label";
import { DENTIST_LOGIN } from "@/lib/dentist-portal";
import { resolveRoleHome } from "@/lib/role-home";

export default async function DentistPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect(DENTIST_LOGIN);
  if (session.user.role !== "PROFESSIONAL" && session.user.role !== "ADMIN") {
    redirect(resolveRoleHome(session.user.role));
  }

  if (session.user.role === "PROFESSIONAL") {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: session.user.id },
      select: { specialty: true },
    });
    if (!profile) {
      redirect("/onboarding?portal=dentist");
    }
    if (!isDentistSpecialty(profile.specialty)) {
      redirect("/professional");
    }
  }

  return children;
}
