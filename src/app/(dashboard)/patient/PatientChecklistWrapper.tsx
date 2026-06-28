"use client";

import dynamic from "next/dynamic";

const PatientChecklist = dynamic(
  () => import("@/components/PatientChecklist"),
  { ssr: false },
);

export default function PatientChecklistWrapper() {
  return <PatientChecklist />;
}
