"use client";

import DentistChartWorkspace from "@/components/dentist/DentistChartWorkspace";
import ProstheticModule from "@/components/dentist/ProstheticModule";

export default function DentalProstheticPage() {
  return (
    <DentistChartWorkspace
      titleKey="dental.mod.prosthetic.title"
      descKey="dental.mod.prosthetic.desc"
      module="prosthetic"
    >
      {(chart) => <ProstheticModule chart={chart} />}
    </DentistChartWorkspace>
  );
}
