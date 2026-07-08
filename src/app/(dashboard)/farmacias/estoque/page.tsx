import PharmacyStoreNav from "@/components/pharmacy-store/PharmacyStoreNav";
import PharmacyInventoryClient from "@/components/pharmacy-store/PharmacyInventoryClient";

export default function FarmaciasEstoquePage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PharmacyStoreNav />
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Estoque e preços</h1>
          <p className="text-slate-500 text-sm mt-1">
            Importe seu banco de dados ou cadastre medicamentos com preço de balcão.
          </p>
        </div>
        <PharmacyInventoryClient />
      </div>
    </div>
  );
}
