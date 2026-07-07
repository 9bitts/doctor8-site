"use client";

import DentistChartWorkspace from "@/components/dentist/DentistChartWorkspace";
import TreatmentPlanModule from "@/components/dentist/TreatmentPlanModule";

export default function DentalTreatmentPlanPage() {
  return (
    <DentistChartWorkspace
      titleKey="dental.mod.treatmentPlan.title"
      descKey="dental.mod.treatmentPlan.desc"
      module="treatmentPlan"
    >
      {(chart) => <TreatmentPlanModule chart={chart} />}
    </DentistChartWorkspace>
  );
}
