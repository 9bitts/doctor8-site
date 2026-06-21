"use client";

// src/app/(dashboard)/professional/ProfessionalTourWrapper.tsx
// Client wrapper that injects ProfessionalTour into the server-rendered professional dashboard.

import dynamic from "next/dynamic";

const ProfessionalTour = dynamic(() => import("@/components/ProfessionalTour"), { ssr: false });

export default function ProfessionalTourWrapper({ lang }: { lang: string }) {
  return <ProfessionalTour lang={lang} />;
}
