import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPharmacyStoreMembership } from "@/lib/pharmacy-store-auth";
import { resolveRoleHome } from "@/lib/role-home";
import { db } from "@/lib/db";
import PharmacyStoreNav from "@/components/pharmacy-store/PharmacyStoreNav";
import { Package, MapPin, Upload, ArrowRight } from "lucide-react";

export default async function FarmaciasPainelPage() {
  const session = await auth();
  if (!session?.user) redirect("/farmacias/login");
  if (session.user.role !== "PHARMACY_STORE" && session.user.role !== "ADMIN") {
    redirect(resolveRoleHome(session.user.role));
  }

  const membership = await getPharmacyStoreMembership(session.user.id);
  if (!membership) redirect("/farmacias/login");

  const store = membership.pharmacyStore;
  const hasAddress = Boolean(store.addressCity && store.addressZip);
  const inventoryCount = await db.pharmacyStoreInventoryItem.count({
    where: { pharmacyStoreId: store.id, available: true },
  });

  const steps = [
    {
      done: hasAddress,
      title: "Informar endereço",
      href: "/farmacias/configuracoes",
      icon: MapPin,
    },
    {
      done: inventoryCount > 0,
      title: "Publicar estoque e preços",
      href: "/farmacias/estoque",
      icon: Upload,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-50">
      <PharmacyStoreNav />
      <div className="p-6 max-w-6xl mx-auto space-y-8">
        <div>
          <p className="text-sm text-emerald-600 font-medium">Doctor8 Farmácias</p>
          <h1 className="text-2xl font-bold text-slate-900 mt-1">{store.nomeFantasia}</h1>
          <p className="text-slate-500 text-sm mt-1">
            CNPJ {store.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}
            {store.addressCity ? ` · ${store.addressCity}/${store.addressState}` : ""}
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <Package className="text-emerald-600 mb-2" size={22} />
            <p className="text-2xl font-bold text-slate-900">{inventoryCount}</p>
            <p className="text-sm text-slate-500">itens no estoque</p>
          </div>
          <div className="rounded-2xl bg-white border border-slate-200 p-5">
            <p className="text-sm font-semibold text-slate-600">Taxa Doctor8</p>
            <p className="text-2xl font-bold text-emerald-600 mt-2">R$ 0,00</p>
            <p className="text-xs text-slate-500 mt-1">por venda — fase de lançamento</p>
          </div>
          <div className="rounded-2xl bg-emerald-600 text-white p-5">
            <p className="text-sm font-medium text-emerald-100">Status</p>
            <p className="text-lg font-bold mt-1">{store.status === "ACTIVE" ? "Ativa" : store.status}</p>
            <p className="text-xs text-emerald-100 mt-1">Pronta para receber cadastros de preços</p>
          </div>
        </div>

        <section className="rounded-2xl bg-white border border-slate-200 p-6">
          <h2 className="font-bold text-slate-900 mb-4">Próximos passos</h2>
          <div className="space-y-3">
            {steps.map((step) => {
              const Icon = step.icon;
              return (
                <Link
                  key={step.href}
                  href={step.href}
                  className="flex items-center gap-4 p-4 rounded-xl border border-slate-100 hover:border-emerald-200 hover:bg-emerald-50/30 transition group"
                >
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                    step.done ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                  }`}>
                    <Icon size={20} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-slate-900">{step.title}</p>
                    <p className="text-xs text-slate-500">{step.done ? "Concluído" : "Pendente"}</p>
                  </div>
                  <ArrowRight size={18} className="text-slate-400 group-hover:text-emerald-600" />
                </Link>
              );
            })}
          </div>
        </section>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          A busca de preços por pacientes na rede Doctor8 será ativada quando houver densidade de farmácias na região.
          Por enquanto, cadastre seu estoque para aparecer primeiro.
        </div>
      </div>
    </div>
  );
}
