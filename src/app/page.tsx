// src/app/page.tsx
// Public landing — specialist directory search (Doctoralia-style)

import EspecialistasLandingClient from "@/components/public/EspecialistasLandingClient";

export const metadata = {
  title: "Doctor8 — Consulte Especialistas Online | Club Doctor",
  description:
    "Consulte médicos, psicólogos, nutricionistas e outros especialistas online. Club Doctor por R$34,90/mês. Dados protegidos com criptografia. Brasil, EUA, Europa e Venezuela.",
};

export default function RootPage() {
  return <EspecialistasLandingClient />;
}
