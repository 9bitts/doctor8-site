"use client";

import ProfessionalChartWorkspace, {
  type ProfessionalChart,
} from "@/components/professional/ProfessionalChartWorkspace";
import AnthropometryModule from "./AnthropometryModule";
import MealPlanModule from "./MealPlanModule";
import IntakeFormsModule from "./IntakeFormsModule";
import FoodDiaryReviewModule from "./FoodDiaryReviewModule";
import NutritionAnamneseTabs from "./NutritionAnamneseTabs";

export type NutritionChart = ProfessionalChart;

export type NutritionModuleId = "anthropometry" | "mealPlans" | "intake" | "foodDiary" | "anamnesis";

export default function NutritionChartWorkspace({
  titleKey,
  descKey,
  module,
}: {
  titleKey: string;
  descKey: string;
  module: NutritionModuleId;
}) {
  function renderModule(chart: NutritionChart) {
    switch (module) {
      case "anthropometry":
        return <AnthropometryModule chart={chart} />;
      case "mealPlans":
        return <MealPlanModule chart={chart} />;
      case "intake":
        return <IntakeFormsModule chart={chart} />;
      case "anamnesis":
        return <NutritionAnamneseTabs chart={chart} />;
      case "foodDiary":
        return <FoodDiaryReviewModule chart={chart} />;
    }
  }

  return (
    <ProfessionalChartWorkspace
      titleKey={titleKey}
      descKey={descKey}
      backHref="/nutricionista"
      accent="amber"
      i18nPrefix="nutri"
    >
      {renderModule}
    </ProfessionalChartWorkspace>
  );
}
