import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { isPharmacistSpecialty } from "@/lib/profession-label";
import { PHARMACIST_LOGIN } from "@/lib/pharmacist-portal";
import { resolveRoleHome } from "@/lib/role-home";

export default async function PharmacistPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect(PHARMACIST_LOGIN);
  if (session.user.role !== "PROFESSIONAL" && session.user.role !== "ADMIN") {
    redirect(resolveRoleHome(session.user.role));
  }

  if (session.user.role === "PROFESSIONAL") {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: session.user.id },
      select: { specialty: true },
    });
    if (!profile) {
      redirect("/onboarding?portal=pharmacist");
    }
    if (!isPharmacistSpecialty(profile.specialty)) {
      redirect("/professional");
    }
  }

  return children;
}
