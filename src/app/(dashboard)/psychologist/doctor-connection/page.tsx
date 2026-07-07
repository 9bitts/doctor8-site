import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { PSYCHOLOGIST_LOGIN } from "@/lib/psychologist-portal";
import PsychologistDoctorConnectionClient from "@/components/psychologist/PsychologistDoctorConnectionClient";

export default async function PsychologistDoctorConnectionPage() {
  const session = await auth();
  if (!session?.user) redirect(PSYCHOLOGIST_LOGIN);
  if (session.user.role !== "PROFESSIONAL") redirect("/patient");

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: { id: true },
  });

  const [subscription, userRow, patientCount] = await Promise.all([
    db.subscription.findUnique({
      where: { userId: session.user.id },
      select: { status: true },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { region: true },
    }),
    professional
      ? db.patientRecord.count({ where: { professionalId: professional.id } })
      : Promise.resolve(0),
  ]);

  const hasActiveSubscription =
    !!subscription && ["active", "trialing"].includes(subscription.status);

  return (
    <PsychologistDoctorConnectionClient
      subscribed={hasActiveSubscription}
      defaultRegion={userRow?.region || session.user.region}
      patientCount={patientCount}
    />
  );
}
