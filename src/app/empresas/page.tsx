import EmpresasLoginHub from "@/components/employer/EmpresasLoginHub";
import EmpresasMarketingLanding from "@/components/employer/EmpresasMarketingLanding";

export const metadata = {
  title: "Doctor8 Empresas — NR-1, EAP e saúde mental corporativa",
  description:
    "Plataforma completa para conformidade NR-1: inventário de riscos psicossociais, EAP com psicólogos, PCMSO, denúncias, pesquisas e documentação exportável.",
};

export default function EmpresasLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <EmpresasLoginHub />
      <EmpresasMarketingLanding />
    </div>
  );
}
