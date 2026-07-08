import FarmaciasLoginHub from "@/components/pharmacy-store/FarmaciasLoginHub";
import FarmaciasMarketingLanding from "@/components/pharmacy-store/FarmaciasMarketingLanding";

export const metadata = {
  title: "Doctor8 Farmácias — Cadastre sua drogaria e publique preços",
  description:
    "Portal gratuito para farmácias: importe estoque e preços em CSV, cadastre endereço e prepare-se para a rede Doctor8.",
};

export default function FarmaciasLandingPage() {
  return (
    <div className="min-h-screen bg-white">
      <FarmaciasLoginHub />
      <FarmaciasMarketingLanding />
    </div>
  );
}
