"use client";

import DentistChartWorkspace from "@/components/dentist/DentistChartWorkspace";
import ClinicalPhotosModule from "@/components/dentist/ClinicalPhotosModule";

export default function DentalPhotosPage() {
  return (
    <DentistChartWorkspace
      titleKey="dental.mod.photos.title"
      descKey="dental.mod.photos.desc"
      module="photos"
    >
      {(chart) => <ClinicalPhotosModule chart={chart} />}
    </DentistChartWorkspace>
  );
}
