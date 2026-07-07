"use client";

import DentistChartWorkspace from "@/components/dentist/DentistChartWorkspace";
import OdontogramModule from "@/components/dentist/OdontogramModule";

export default function DentalOdontogramPage() {
  return (
    <DentistChartWorkspace
      titleKey="dental.mod.odontogram.title"
      descKey="dental.mod.odontogram.desc"
      module="odontogram"
    >
      {(chart) => <OdontogramModule chart={chart} />}
    </DentistChartWorkspace>
  );
}
