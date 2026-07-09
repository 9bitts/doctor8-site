// src/app/page.tsx
// Public landing — specialist directory search (Doctoralia-style)

import EspecialistasLandingClient from "@/components/public/EspecialistasLandingClient";

export const metadata = {
  title: "Doctor8 — Saúde Digital Completa | Consultas, Farmácia e Club Doctor",
  description:
    "Ecossistema de saúde digital: consultas online em 80+ especialidades, plantão imediato, receitas digitais, rede de farmácias, Club Doctor por R$34,90/mês e benefício corporativo. Brasil, EUA, Europa e Venezuela.",
};

export default function RootPage() {
  return <EspecialistasLandingClient />;
}
