import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { redirect } from "next/navigation";
import { DEFAULT_TIME_ZONE } from "@/lib/timezone";
import JitClient from "./JitClient";

export default async function JitPage() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "PROFESSIONAL") redirect("/patient");

  const professional = await db.professionalProfile.findUnique({
    where: { userId: session.user.id },
    select: { timezone: true },
  });
  if (!professional) redirect("/onboarding");

  const providerTz = professional.timezone || DEFAULT_TIME_ZONE;

  return <JitClient providerTz={providerTz} />;
}
