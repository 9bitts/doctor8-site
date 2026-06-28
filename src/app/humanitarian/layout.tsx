import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Atenci\u00f3n humanitaria \u2014 Venezuela | Doctor8",
  description:
    "Atenci\u00f3n m\u00e9dica y de salud mental gratuita para personas afectadas por el terremoto en Venezuela.",
};

export default function HumanitarianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
