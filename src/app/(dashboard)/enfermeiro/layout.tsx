import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { isNurseSpecialty } from "@/lib/profession-label";
import { NURSE_LOGIN } from "@/lib/nurse-portal";
import { resolveRoleHome } from "@/lib/role-home";

export default async function NursePortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect(NURSE_LOGIN);
  if (session.user.role !== "PROFESSIONAL" && session.user.role !== "ADMIN") {
    redirect(resolveRoleHome(session.user.role));
  }

  if (session.user.role === "PROFESSIONAL") {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: session.user.id },
      select: { specialty: true },
    });
    if (profile && !isNurseSpecialty(profile.specialty)) {
      redirect("/professional");
    }
  }

  return children;
}
