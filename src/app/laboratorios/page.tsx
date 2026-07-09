import LaboratoriosLoginHub from "@/components/laboratory/LaboratoriosLoginHub";
import LaboratoriosMarketingLanding from "@/components/laboratory/LaboratoriosMarketingLanding";

export const metadata = {
  title: "Doctor8 Laboratórios — Cadastre seu lab e publique preços de exames",
  description:
    "Portal gratuito para laboratórios: importe exames e preços em CSV, cadastre endereço e prepare-se para a rede Doctor8.",
};

export default function LaboratoriosLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <LaboratoriosLoginHub />
      <LaboratoriosMarketingLanding />
    </div>
  );
}
