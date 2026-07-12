import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { resolveRoleHome } from "@/lib/role-home";
import { canAccessPharmacyPharmacistPortal } from "@/lib/pharmacy-portal-guards";
import { Pill, ArrowRight, Stethoscope } from "lucide-react";
import PharmacistNetworkQueueClient from "@/components/pharmacy-store/PharmacistNetworkQueueClient";

export default async function FarmaciasFarmaceuticoPainelPage() {
  const session = await auth();
  if (!session?.user) redirect("/farmacias/farmaceutico/login");

  const role = session.user.role;
  if (role !== "PROFESSIONAL" && role !== "ADMIN") {
    redirect(resolveRoleHome(role));
  }

  if (role === "PROFESSIONAL") {
    if (!canAccessPharmacyPharmacistPortal(role, session.user.professionalSpecialty)) {
      redirect(resolveRoleHome(role, session.user.professionalSpecialty));
    }
  }

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b border-slate-200 bg-white">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <Pill className="text-teal-600" size={24} />
          <div>
            <p className="text-xs font-semibold text-teal-600 uppercase">Doctor8 Farmácias</p>
            <h1 className="font-bold text-slate-900">Portal do farmacêutico</h1>
          </div>
        </div>
      </header>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <p className="text-slate-600 text-sm">
          Valide receitas e acompanhe pedidos da rede Doctor8 Farmácias.
        </p>

        <section className="space-y-3">
          <h2 className="font-bold text-slate-900">Fila de receitas pendentes</h2>
          <PharmacistNetworkQueueClient />
        </section>

        <div className="grid sm:grid-cols-2 gap-4">
          <Link
            href="/farmaceutico"
            className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-teal-300 hover:shadow-md transition group"
          >
            <Stethoscope className="text-teal-600 mb-3" size={28} />
            <h2 className="font-bold text-slate-900">Portal clínico</h2>
            <p className="text-sm text-slate-500 mt-2">
              Telefarmácia, revisão medicamentosa, conciliação e dispensação clínica.
            </p>
            <span className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-teal-700 group-hover:gap-2 transition-all">
              Abrir /farmaceutico <ArrowRight size={16} />
            </span>
          </Link>

          <Link
            href="/farmacias"
            className="rounded-2xl border border-slate-200 bg-white p-6 hover:border-teal-300 hover:shadow-md transition group"
          >
            <Pill className="text-teal-600 mb-3" size={28} />
            <h2 className="font-bold text-slate-900">Rede Doctor8</h2>
            <p className="text-sm text-slate-500 mt-2">
              Informações para farmácias parceiras e cadastro de lojas.
            </p>
            <span className="inline-flex items-center gap-1 mt-4 text-sm font-semibold text-teal-700 group-hover:gap-2 transition-all">
              doctor8.org/farmacias <ArrowRight size={16} />
            </span>
          </Link>
        </div>

        <Link href="/farmacias" className="text-sm text-slate-500 hover:text-slate-700">
          ← Voltar para doctor8.org/farmacias
        </Link>
      </div>
    </div>
  );
}
