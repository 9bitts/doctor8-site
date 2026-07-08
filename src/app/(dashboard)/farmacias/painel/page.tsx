import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import Link from "next/link";
import { getPharmacyStoreMembership } from "@/lib/pharmacy-store-auth";
import { resolveRoleHome } from "@/lib/role-home";
import { db } from "@/lib/db";
import { buildPharmacyStoreAnalytics } from "@/lib/pharmacy-store-analytics";
import { Package, MapPin, Upload, ArrowRight, ShoppingBag, TrendingUp } from "lucide-react";

const STORE_STATUS_LABEL: Record<string, { label: string; hint: string }> = {
  PENDING_REVIEW: {
    label: "Em revisão",
    hint: "Aguardando aprovação da equipe Doctor8",
  },
  ACTIVE: {
    label: "Ativa na rede",
    hint: "Visível para pacientes na sua região",
  },
  SUSPENDED: {
    label: "Suspensa",
    hint: "Entre em contato com o suporte Doctor8",
  },
};

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
  const analytics = await buildPharmacyStoreAnalytics(store.id);

  const formatBrl = (cents: number) =>
    (cents / 100).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

  const statusInfo = STORE_STATUS_LABEL[store.status] ?? {
    label: store.status,
    hint: "",
  };

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
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <p className="text-sm text-emerald-600 font-medium">Doctor8 Farmácias</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{store.nomeFantasia}</h1>
        <p className="text-slate-500 text-sm mt-1">
          CNPJ {store.cnpj.replace(/^(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})$/, "$1.$2.$3/$4-$5")}
          {store.addressCity ? ` · ${store.addressCity}/${store.addressState}` : ""}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <Package className="text-emerald-600 mb-2" size={22} />
          <p className="text-2xl font-bold text-slate-900">{inventoryCount}</p>
          <p className="text-sm text-slate-500">itens no estoque</p>
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <ShoppingBag className="text-emerald-600 mb-2" size={22} />
          <p className="text-2xl font-bold text-slate-900">{analytics.ordersPaid}</p>
          <p className="text-sm text-slate-500">pedidos pagos</p>
          {analytics.ordersPending > 0 && (
            <p className="text-xs text-amber-600 mt-1">{analytics.ordersPending} em andamento</p>
          )}
        </div>
        <div className="rounded-2xl bg-white border border-slate-200 p-5">
          <TrendingUp className="text-emerald-600 mb-2" size={22} />
          <p className="text-2xl font-bold text-emerald-600">{formatBrl(analytics.revenueLast30DaysCents)}</p>
          <p className="text-sm text-slate-500">receita (30 dias)</p>
          <p className="text-xs text-slate-400 mt-1">{analytics.ordersLast30Days} pedidos no período</p>
        </div>
        <div className={`rounded-2xl p-5 text-white ${
          store.status === "ACTIVE"
            ? "bg-emerald-600"
            : store.status === "SUSPENDED"
              ? "bg-red-600"
              : "bg-amber-500"
        }`}>
          <p className="text-sm font-medium opacity-90">Status</p>
          <p className="text-lg font-bold mt-1">{statusInfo.label}</p>
          <p className="text-xs opacity-90 mt-1">{statusInfo.hint}</p>
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

      {store.status === "PENDING_REVIEW" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Sua farmácia está em revisão. Após aprovação em <strong>/admin/farmacias</strong>, pacientes poderão encontrá-la na rede Doctor8.
        </div>
      )}

      {store.status === "ACTIVE" && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          A busca de preços por pacientes na rede Doctor8 será ativada quando houver densidade de farmácias na região.
          Cadastre seu estoque agora para aparecer primeiro.
        </div>
      )}
    </div>
  );
}
