import PharmacyStoreNav from "@/components/pharmacy-store/PharmacyStoreNav";
import PharmacyStoreOrdersClient from "@/components/pharmacy-store/PharmacyStoreOrdersClient";

export default function FarmaciasPedidosPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PharmacyStoreNav />
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Pedidos</h1>
          <p className="text-slate-500 text-sm mt-1">
            Pedidos pagos pela rede Doctor8 — confirme, prepare e registre a entrega.
          </p>
        </div>
        <PharmacyStoreOrdersClient />
      </div>
    </div>
  );
}
