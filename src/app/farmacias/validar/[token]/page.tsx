import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import PharmacyValidateClient from "@/components/pharmacy-store/PharmacyValidateClient";

type Props = { params: Promise<{ token: string }> };

export default async function FarmaciasValidarPage({ params }: Props) {
  const { token } = await params;
  const session = await auth();

  if (!session?.user) {
    redirect(`/farmacias/login?callbackUrl=${encodeURIComponent(`/farmacias/validar/${token}`)}`);
  }

  return <PharmacyValidateClient token={token} />;
}
