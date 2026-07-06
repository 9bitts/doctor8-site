import NutritionChartWorkspace from "@/components/nutritionist/NutritionChartWorkspace";
import AnthropometryModule from "@/components/nutritionist/AnthropometryModule";

export default function NutritionAnthropometryPage() {
  return (
    <NutritionChartWorkspace
      titleKey="nutri.mod.anthropometry.title"
      descKey="nutri.mod.anthropometry.pageDesc"
    >
      {(chart) => <AnthropometryModule chart={chart} />}
    </NutritionChartWorkspace>
  );
}
