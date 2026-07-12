import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getPharmacyStoreMembership, isPharmacyStoreActive } from "@/lib/pharmacy-store-auth";
import PharmacyStoreOrdersClient from "@/components/pharmacy-store/PharmacyStoreOrdersClient";

export default async function FarmaciasPedidosPage() {
  const session = await auth();
  if (!session?.user) redirect("/farmacias/login");

  let readOnly = false;
  if (session.user.role === "PHARMACY_STORE") {
    const membership = await getPharmacyStoreMembership(session.user.id);
    readOnly = membership ? !isPharmacyStoreActive(membership.pharmacyStore.status) : true;
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pedidos</h1>
        <p className="text-slate-500 text-sm mt-1">
          Pedidos pagos pela rede Doctor8 — confirme, prepare e registre a entrega.
        </p>
      </div>
      <PharmacyStoreOrdersClient readOnly={readOnly} />
    </div>
  );
}
