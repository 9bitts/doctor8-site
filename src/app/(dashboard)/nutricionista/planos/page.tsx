import NutritionChartWorkspace from "@/components/nutritionist/NutritionChartWorkspace";
import MealPlanModule from "@/components/nutritionist/MealPlanModule";

export default function NutritionMealPlansPage() {
  return (
    <NutritionChartWorkspace
      titleKey="nutri.mod.mealPlans.title"
      descKey="nutri.mod.mealPlans.pageDesc"
    >
      {(chart) => <MealPlanModule chart={chart} />}
    </NutritionChartWorkspace>
  );
}
