import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { resolveRoleHome } from "@/lib/role-home";
import ProfessionalDoctorConnectionClient from "@/components/professional/ProfessionalDoctorConnectionClient";

export default async function ProfessionalDoctorConnectionPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PROFESSIONAL") redirect(resolveRoleHome(session.user.role));

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
    <ProfessionalDoctorConnectionClient
      subscribed={hasActiveSubscription}
      defaultRegion={userRow?.region || session.user.region}
    />
  );
}
