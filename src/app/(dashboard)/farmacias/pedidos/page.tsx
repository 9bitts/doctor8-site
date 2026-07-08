import PharmacyStoreOrdersClient from "@/components/pharmacy-store/PharmacyStoreOrdersClient";

export default function FarmaciasPedidosPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pedidos</h1>
        <p className="text-slate-500 text-sm mt-1">
          Pedidos pagos pela rede Doctor8 — confirme, prepare e registre a entrega.
        </p>
      </div>
      <PharmacyStoreOrdersClient />
    </div>
  );
}
