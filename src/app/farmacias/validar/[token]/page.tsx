import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { canAccessPharmacyValidatePortal } from "@/lib/pharmacy-portal-guards";
import PharmacyValidateClient from "@/components/pharmacy-store/PharmacyValidateClient";

type Props = { params: Promise<{ token: string }> };

export default async function FarmaciasValidarPage({ params }: Props) {
  const { token } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/farmacias/login?callbackUrl=${encodeURIComponent(`/farmacias/validar/${token}`)}`);
  }

  let specialty: string | null = session.user.professionalSpecialty ?? null;
  if (session.user.role === "PROFESSIONAL" && !specialty) {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: session.user.id },
      select: { specialty: true },
    });
    specialty = profile?.specialty ?? null;
  }

  if (!canAccessPharmacyValidatePortal(session.user.role, specialty)) {
    redirect(`/farmacias/login?error=invalid&callbackUrl=${encodeURIComponent(`/farmacias/validar/${token}`)}`);
  }

  return <PharmacyValidateClient token={token} />;
}
