import LegalLayout from "@/components/LegalLayout";
import {
  ACURA_VOLUNTEER_TERMS_LAST_UPDATED,
  ACURA_VOLUNTEER_TERMS_SECTIONS,
} from "@/lib/legal/acura-volunteer-terms";

export const metadata = {
  title: "Termo de Ades?o ao Voluntariado AcuraBrasil | Doctor8",
  description:
    "Termo de Ades?o ao Servi?o Volunt?rio AcuraBrasil (Lei n? 9.608/1998) para profissionais de sa?de na plataforma Doctor8.",
  robots: { index: true, follow: true },
};

export default function AcuraVoluntariadoPage() {
  return (
    <LegalLayout
      badge="Voluntariado"
      badgeColor="#0284c7"
      title={{
        pt: "Termo de Ades?o ao Servi?o Volunt?rio",
        en: "Volunteer Service Adhesion Agreement",
        es: "T?rmino de Adhesi?n al Servicio Voluntario",
      }}
      subtitle={{
        pt: "Selo Volunt?rio AcuraBrasil ? ACURA BRASIL ? Doctor8",
        en: "AcuraBrasil Volunteer Seal ? ACURA BRASIL ? Doctor8",
        es: "Sello Voluntario AcuraBrasil ? ACURA BRASIL ? Doctor8",
      }}
      lastUpdated={ACURA_VOLUNTEER_TERMS_LAST_UPDATED}
      sections={ACURA_VOLUNTEER_TERMS_SECTIONS}
    />
  );
}
