import PharmacyStoreSettingsClient from "@/components/pharmacy-store/PharmacyStoreSettingsClient";

export default function FarmaciasConfiguracoesPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 text-sm mt-1">Endereço e opções da sua farmácia na rede Doctor8.</p>
      </div>
      <PharmacyStoreSettingsClient />
    </div>
  );
}
