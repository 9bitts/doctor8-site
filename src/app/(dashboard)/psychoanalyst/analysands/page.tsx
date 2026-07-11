import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { DEFAULT_TIME_ZONE } from "@/lib/timezone";
import AnalysandsPageClient from "@/components/psychoanalyst/AnalysandsPageClient";

export default async function AnalysandsPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PSYCHOANALYST") redirect("/patient");

  const userRow = await db.user.findUnique({
    where: { id: session.user.id },
    select: { timezone: true },
  });

  return <AnalysandsPageClient timeZone={userRow?.timezone || DEFAULT_TIME_ZONE} />;
}
