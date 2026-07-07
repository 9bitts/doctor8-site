"use client";

import DentistChartWorkspace from "@/components/dentist/DentistChartWorkspace";
import AnamnesisModule from "@/components/dentist/AnamnesisModule";

export default function DentalAnamnesisPage() {
  return (
    <DentistChartWorkspace
      titleKey="dental.mod.anamnesis.title"
      descKey="dental.mod.anamnesis.desc"
      module="anamnesis"
    >
      {(chart) => <AnamnesisModule chart={chart} />}
    </DentistChartWorkspace>
  );
}
