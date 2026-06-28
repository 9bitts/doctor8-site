import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { isPsychologistSpecialty, PSYCHOLOGIST_LOGIN } from "@/lib/psychologist-portal";

export default async function PsychologistPortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (!session?.user) redirect(PSYCHOLOGIST_LOGIN);
  if (session.user.role !== "PROFESSIONAL" && session.user.role !== "ADMIN") {
    redirect("/unauthorized");
  }

  if (session.user.role === "PROFESSIONAL") {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: session.user.id },
      select: { specialty: true },
    });
    if (profile && !isPsychologistSpecialty(profile.specialty)) {
      redirect("/professional");
    }
  }

  return children;
}
