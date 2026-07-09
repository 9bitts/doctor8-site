import MarketingNav from "@/components/marketing/MarketingNav";
import MarketingFooter from "@/components/marketing/MarketingFooter";
import EmpresasLoginHub from "@/components/employer/EmpresasLoginHub";
import EmpresasMarketingLanding from "@/components/employer/EmpresasMarketingLanding";

export const metadata = {
  title: "Doctor8 Empresas — NR-1, EAP, PCMSO, eSocial e saúde mental corporativa",
  description:
    "Plataforma B2B completa: inventário NR-1, pesquisas HSE-IT, EAP com psicólogos CRP, exames/ASO, eSocial S-2220, assinatura ICP, trilhas de bem-estar, benchmarks setoriais e integrações enterprise.",
};

export default function EmpresasLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <MarketingNav active="empresas" />
      <EmpresasLoginHub />
      <EmpresasMarketingLanding />
      <MarketingFooter />
    </div>
  );
}
