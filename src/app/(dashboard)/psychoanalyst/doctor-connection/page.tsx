import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import PsychoanalystDoctorConnectionClient from "@/components/psychoanalyst/PsychoanalystDoctorConnectionClient";

export default async function PsychoanalystDoctorConnectionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login/psicanalista");
  if (session.user.role !== "PSYCHOANALYST") redirect("/patient");

  const [subscription, userRow] = await Promise.all([
    db.subscription.findUnique({
      where: { userId: session.user.id },
      select: { status: true },
    }),
    db.user.findUnique({
      where: { id: session.user.id },
      select: { region: true },
    }),
  ]);

  const hasActiveSubscription =
    !!subscription && ["active", "trialing"].includes(subscription.status);

  return (
    <PsychoanalystDoctorConnectionClient
      subscribed={hasActiveSubscription}
      defaultRegion={userRow?.region || session.user.region}
    />
  );
}
