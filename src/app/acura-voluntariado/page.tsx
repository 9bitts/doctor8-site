import LegalLayout from "@/components/LegalLayout";
import {
  ACURA_VOLUNTEER_TERMS_LAST_UPDATED,
  ACURA_VOLUNTEER_TERMS_SECTIONS,
} from "@/lib/legal/acura-volunteer-terms";

export const metadata = {
  title: "Termo de Adesão ao Voluntariado AcuraBrasil | Doctor8",
  description:
    "Termo de Adesão ao Serviço Voluntário AcuraBrasil (Lei nº 9.608/1998) para profissionais de saúde na plataforma Doctor8.",
  robots: { index: true, follow: true },
};

export default function AcuraVoluntariadoPage() {
  return (
    <LegalLayout
      badge="Voluntariado"
      badgeColor="#0284c7"
      title={{
        pt: "Termo de Adesão ao Serviço Voluntário",
        en: "Volunteer Service Adhesion Agreement",
        es: "Término de Adhesión al Servicio Voluntario",
      }}
      subtitle={{
        pt: "Programa Selo Voluntário AcuraBrasil · ACURA BRASIL · Doctor8",
        en: "AcuraBrasil Volunteer Seal Program · ACURA BRASIL · Doctor8",
        es: "Programa Sello Voluntario AcuraBrasil · ACURA BRASIL · Doctor8",
      }}
      lastUpdated={ACURA_VOLUNTEER_TERMS_LAST_UPDATED}
      sections={ACURA_VOLUNTEER_TERMS_SECTIONS}
    />
  );
}
