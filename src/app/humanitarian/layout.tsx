import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Atenci?n humanitaria ? Venezuela | Doctor8",
  description:
    "Atenci?n m?dica y de salud mental gratuita para personas afectadas por el terremoto en Venezuela.",
};

export default function HumanitarianLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
