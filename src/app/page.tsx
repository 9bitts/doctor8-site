// src/app/page.tsx
// Public landing — specialist directory search (Doctoralia-style)

import EspecialistasLandingClient from "@/components/public/EspecialistasLandingClient";

export const metadata = {
  title: "Encontre especialistas de saúde | Doctor8",
  description:
    "Busque profissionais de saúde por especialidade e cidade. Agende consultas online ou presenciais.",
};

export default function RootPage() {
  return <EspecialistasLandingClient />;
}
