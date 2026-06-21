"use client";

// src/app/(dashboard)/patient/PatientTourWrapper.tsx
// Client wrapper that injects PatientTour into the server-rendered patient dashboard.
// Receives lang from the server component via props.

import dynamic from "next/dynamic";

const PatientTour = dynamic(() => import("@/components/PatientTour"), { ssr: false });

export default function PatientTourWrapper({ lang }: { lang: string }) {
  return <PatientTour lang={lang} />;
}
