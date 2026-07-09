import LaboratorySettingsClient from "@/components/laboratory/LaboratorySettingsClient";

export default function LaboratoriosConfiguracoesPage() {
  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Configurações</h1>
        <p className="text-slate-500 text-sm mt-1">Endereço, tipo de laboratório e dados de contato.</p>
      </div>
      <LaboratorySettingsClient />
    </div>
  );
}
