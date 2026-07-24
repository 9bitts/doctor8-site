import type { Metadata } from "next";
import MedicosPelaVidaLanding from "@/components/partners/MedicosPelaVidaLanding";
import { MPV_META } from "@/lib/medicospelavida-content";

export const metadata: Metadata = {
  title: MPV_META.title,
  description: MPV_META.description,
  openGraph: {
    title: MPV_META.title,
    description: MPV_META.description,
    url: "https://app.doctor8.org/medicospelavida",
    type: "website",
  },
};

export default function MedicosPelaVidaPage() {
  return <MedicosPelaVidaLanding />;
}
