import PharmacyStoreNav from "@/components/pharmacy-store/PharmacyStoreNav";
import PharmacyStoreSettingsClient from "@/components/pharmacy-store/PharmacyStoreSettingsClient";

export default function FarmaciasConfiguracoesPage() {
  return (
    <div className="min-h-screen bg-slate-50">
      <PharmacyStoreNav />
      <div className="p-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
          <p className="text-slate-500 text-sm mt-1">Endereço e opções da sua farmácia na rede Doctor8.</p>
        </div>
        <PharmacyStoreSettingsClient />
      </div>
    </div>
  );
}
