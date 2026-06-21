"use client";

// src/app/(dashboard)/professional/ProfessionalChecklistWrapper.tsx
// Client wrapper — injects the checklist into the server-rendered dashboard.

import dynamic from "next/dynamic";

const ProfessionalChecklist = dynamic(
  () => import("@/components/ProfessionalChecklist"),
  { ssr: false }
);

export default function ProfessionalChecklistWrapper() {
  return <ProfessionalChecklist />;
}
