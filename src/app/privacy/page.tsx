// src/app/privacy/page.tsx
// Política de Privacidade — documento oficial INFO8
// Trilingual: PT / EN / ES

import LegalLayout from "@/components/LegalLayout";
import { privacySections } from "@/lib/legal/privacy-content";

export const metadata = {
  title: "Política de Privacidade | Privacy Policy | Doctor8",
  description: "Política de Privacidade da Doctor8 — tratamento de dados alinhado aos princípios LGPD e GDPR.",
  robots: { index: true, follow: true },
};

export default function PrivacyPage() {
  return (
    <LegalLayout
      title={{ pt: "Política de Privacidade", en: "Privacy Policy", es: "Política de Privacidad" }}
      subtitle={{
        pt: "INFO8 Desenvolvimento de Sistemas e Site Ltda · DOCTOR8 · Princípios LGPD e GDPR",
        en: "INFO8 Desenvolvimento de Sistemas e Site Ltda · DOCTOR8 · LGPD and GDPR Principles",
        es: "INFO8 Desenvolvimento de Sistemas e Site Ltda · DOCTOR8 · Principios LGPD y GDPR",
      }}
      lastUpdated="Janeiro de 2026"
      badge="LGPD + GDPR"
      badgeColor="#176a88"
      sections={privacySections}
    />
  );
}
