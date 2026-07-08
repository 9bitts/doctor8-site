import { EmployerIntegrationsSection } from "@/components/employer/EmployerIntegrationsSection";
import { EsocialPartnerSection } from "@/components/employer/EsocialPartnerSection";

export default function IntegracoesPage() {
  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Integrações</h1>
        <p className="text-slate-500 text-sm mt-1">
          Rotas e fluxos prontos para apresentação. Ative parceiros (Lacuna, eSocial, Stripe metered, clínicas) após contratação.
        </p>
      </div>
      <EmployerIntegrationsSection />
      <EsocialPartnerSection />
    </div>
  );
}
