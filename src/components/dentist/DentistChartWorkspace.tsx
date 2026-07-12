"use client";

import ProfessionalChartWorkspace, {
  type ProfessionalChart,
} from "@/components/professional/ProfessionalChartWorkspace";

export type DentistChart = ProfessionalChart;

export type DentistModuleId =
  | "anamnesis"
  | "odontogram"
  | "periodontogram"
  | "treatmentPlan"
  | "prosthetic"
  | "orthodontics"
  | "photos";

export default function DentistChartWorkspace({
  titleKey,
  descKey,
  module: _module,
  children,
}: {
  titleKey: string;
  descKey: string;
  module: DentistModuleId;
  children: (chart: DentistChart) => React.ReactNode;
}) {
  return (
    <ProfessionalChartWorkspace
      titleKey={titleKey}
      descKey={descKey}
      backHref="/odontologo"
      accent="fuchsia"
      i18nPrefix="dental"
    >
      {children}
    </ProfessionalChartWorkspace>
  );
}
