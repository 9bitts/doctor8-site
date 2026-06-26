import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SOS Venezuela ? Atenci?n humanitaria gratuita | Doctor8",
  description:
    "Teleconsulta m?dica y de salud mental gratuita para v?ctimas del terremoto en Venezuela. Voluntarios Doctor8 y ACURA Brasil.",
};

export default function SosVenezuelaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
