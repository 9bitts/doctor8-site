import LegalLayout from "@/components/LegalLayout";
import {
  TELEMEDICINE_TCLE_LAST_UPDATED,
  TELEMEDICINE_TCLE_SECTIONS,
} from "@/lib/legal/tcle-telemedicine";

export const metadata = {
  title: "TCLE Telemedicina | Doctor8",
  description:
    "Termo de Consentimento Livre e Esclarecido para atendimento em sa\u00fade a dist\u00e2ncia (telemedicina).",
  robots: { index: true, follow: true },
};

export default function TcleTelemedicinaPage() {
  return (
    <LegalLayout
      badge="TCLE"
      badgeColor="#00b87a"
      title={{
        pt: "Termo de Consentimento Livre e Esclarecido",
        en: "Free and Informed Consent Form",
        es: "T\u00e9rmino de Consentimiento Libre e Informado",
      }}
      subtitle={{
        pt: "Atendimento em sa\u00fade a dist\u00e2ncia (telemedicina / teleconsulta) \u2014 Doctor8",
        en: "Remote healthcare services (telemedicine / teleconsultation) \u2014 Doctor8",
        es: "Atenci\u00f3n en salud a distancia (telemedicina / teleconsulta) \u2014 Doctor8",
      }}
      lastUpdated={TELEMEDICINE_TCLE_LAST_UPDATED}
      sections={TELEMEDICINE_TCLE_SECTIONS}
    />
  );
}
