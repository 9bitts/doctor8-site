import NutritionChartWorkspace from "@/components/nutritionist/NutritionChartWorkspace";
import IntakeFormsModule from "@/components/nutritionist/IntakeFormsModule";

export default function NutritionAnamnesePage() {
  return (
    <NutritionChartWorkspace
      titleKey="nutri.mod.anamnese.title"
      descKey="nutri.mod.anamnese.pageDesc"
    >
      {(chart) => <IntakeFormsModule chart={chart} />}
    </NutritionChartWorkspace>
  );
}
