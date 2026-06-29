"use client";

import dynamic from "next/dynamic";

const ProfessionalTour = dynamic(() => import("@/components/ProfessionalTour"), { ssr: false });

export default function PsychologistTourWrapper({ lang }: { lang: string }) {
  return <ProfessionalTour lang={lang} portal="psychologist" />;
}
