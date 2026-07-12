import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { isNutritionistSpecialty } from "@/lib/profession-label";
import { NUTRITIONIST_LOGIN } from "@/lib/nutritionist-portal";
import { resolveRoleHome } from "@/lib/role-home";

export default async function NutritionistPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect(NUTRITIONIST_LOGIN);
  if (session.user.role !== "PROFESSIONAL" && session.user.role !== "ADMIN") {
    redirect(resolveRoleHome(session.user.role));
  }

  if (session.user.role === "PROFESSIONAL") {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: session.user.id },
      select: { specialty: true },
    });
    if (!profile) {
      redirect("/onboarding?portal=nutritionist");
    }
    if (!isNutritionistSpecialty(profile.specialty)) {
      redirect("/professional");
    }
  }

  return children;
}
