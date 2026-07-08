import PharmacyStoreTeamClient from "@/components/pharmacy-store/PharmacyStoreTeamClient";

export default function FarmaciasEquipePage() {
  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Equipe</h1>
        <p className="text-sm text-slate-500 mt-1">
          Gerencie quem acessa o painel desta farmácia.
        </p>
      </div>
      <PharmacyStoreTeamClient />
    </div>
  );
}
