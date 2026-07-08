import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveRoleHome } from "@/lib/role-home";
import { PharmacyValidateTokenForm } from "@/components/pharmacy-store/PharmacyValidateTokenForm";

export default async function FarmaciasValidarHubPage() {
  const session = await auth();
  if (!session?.user) redirect("/farmacias/login?callbackUrl=/farmacias/validar");

  const role = session.user.role;
  if (
    role !== "PHARMACY_STORE" &&
    role !== "PROFESSIONAL" &&
    role !== "ADMIN"
  ) {
    redirect(resolveRoleHome(role));
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
