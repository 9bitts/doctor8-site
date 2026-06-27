// src/app/terms/page.tsx
// Termos de Uso — documento oficial INFO8
// Trilingual: PT / EN / ES

import LegalLayout from "@/components/LegalLayout";
import { termsSections } from "@/lib/legal/terms-content";

export const metadata = {
  title: "Termos de Uso | Terms of Use | Doctor8",
  description:
    "Termos de Uso e Acordo do Usuário do Programa de Computador (Software) On Line denominado Doctor8 de titularidade da INFO8.",
  robots: { index: true, follow: true },
};

export default function TermsPage() {
  return (
    <LegalLayout
      title={{
        pt: "Termos de Uso e Acordo do Usuário",
        en: "Terms of Use and User Agreement",
        es: "Términos de Uso y Acuerdo del Usuario",
      }}
      subtitle={{
        pt: "INFO8 Desenvolvimento de Sistemas e Site Ltda · DOCTOR8",
        en: "INFO8 Desenvolvimento de Sistemas e Site Ltda · DOCTOR8",
        es: "INFO8 Desenvolvimento de Sistemas e Site Ltda · DOCTOR8",
      }}
      lastUpdated="Janeiro de 2026"
      badge="Termos Legais"
      badgeColor="#e05930"
      sections={termsSections}
    />
  );
}
