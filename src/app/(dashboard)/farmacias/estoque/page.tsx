import PharmacyInventoryClient from "@/components/pharmacy-store/PharmacyInventoryClient";

export default function FarmaciasEstoquePage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Estoque e preços</h1>
        <p className="text-slate-500 text-sm mt-1">
          Importe seu banco de dados ou cadastre medicamentos com preço de balcão.
        </p>
      </div>
      <PharmacyInventoryClient />
    </div>
  );
}
