import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "SOS Venezuela \u2014 Atenci\u00f3n humanitaria gratuita | Doctor8",
  description:
    "Teleconsulta m\u00e9dica y de salud mental gratuita para v\u00edctimas del terremoto en Venezuela. Voluntarios Doctor8 y ACURA Brasil.",
  manifest: "/manifest-sos.json",
  themeColor: "#059669",
};

export default function SosVenezuelaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
