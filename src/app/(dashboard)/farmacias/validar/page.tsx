import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { canAccessPharmacyValidatePortal } from "@/lib/pharmacy-portal-guards";
import { db } from "@/lib/db";
import { PharmacyValidateTokenForm } from "@/components/pharmacy-store/PharmacyValidateTokenForm";

export default async function FarmaciasValidarHubPage() {
  const session = await auth();
  if (!session?.user) redirect("/farmacias/login?callbackUrl=/farmacias/validar");

  const role = session.user.role;
  let specialty = session.user.professionalSpecialty ?? null;
  if (role === "PROFESSIONAL" && !specialty) {
    const profile = await db.professionalProfile.findUnique({
      where: { userId: session.user.id },
      select: { specialty: true },
    });
    specialty = profile?.specialty ?? null;
  }
  if (!canAccessPharmacyValidatePortal(role, specialty)) {
    redirect("/farmacias/login?error=invalid");
  }

  return (
    <div className="max-w-lg mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Validar receita</h1>
        <p className="text-sm text-slate-500 mt-1">
          Escaneie o QR ou informe o código para dispensação na bancada.
        </p>
      </div>
      <PharmacyValidateTokenForm />
      <Link href="/farmacias/pedidos" className="text-sm text-slate-500 hover:text-slate-700">
        ← Voltar aos pedidos
      </Link>
    </div>
  );
}
