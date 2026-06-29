import { Suspense } from "react";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isPsychologistSpecialty } from "@/lib/psychologist-portal";
import PsychologistPortalRedirect from "./PsychologistPortalRedirect";

export default async function ProfessionalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  if (session?.user?.role === "PROFESSIONAL") {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: session.user.id },
      select: { specialty: true },
    });
    if (profile && isPsychologistSpecialty(profile.specialty)) {
      return (
        <Suspense>
          <PsychologistPortalRedirect />
        </Suspense>
      );
    }
  }

  return children;
}
