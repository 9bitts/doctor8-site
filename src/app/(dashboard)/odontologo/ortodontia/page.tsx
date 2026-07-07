"use client";

import DentistChartWorkspace from "@/components/dentist/DentistChartWorkspace";
import OrthodonticModule from "@/components/dentist/OrthodonticModule";

export default function DentalOrthodonticsPage() {
  return (
    <DentistChartWorkspace
      titleKey="dental.mod.orthodontics.title"
      descKey="dental.mod.orthodontics.desc"
      module="orthodontics"
    >
      {(chart) => <OrthodonticModule chart={chart} />}
    </DentistChartWorkspace>
  );
}
