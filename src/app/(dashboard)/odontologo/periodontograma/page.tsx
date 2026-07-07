"use client";

import DentistChartWorkspace from "@/components/dentist/DentistChartWorkspace";
import PeriodontogramModule from "@/components/dentist/PeriodontogramModule";

export default function DentalPeriodontogramPage() {
  return (
    <DentistChartWorkspace
      titleKey="dental.mod.periodontogram.title"
      descKey="dental.mod.periodontogram.desc"
      module="periodontogram"
    >
      {(chart) => <PeriodontogramModule chart={chart} />}
    </DentistChartWorkspace>
  );
}
