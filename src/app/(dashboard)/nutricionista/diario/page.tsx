import NutritionChartWorkspace from "@/components/nutritionist/NutritionChartWorkspace";
import FoodDiaryReviewModule from "@/components/nutritionist/FoodDiaryReviewModule";

export default function NutritionFoodDiaryPage() {
  return (
    <NutritionChartWorkspace
      titleKey="nutri.mod.foodDiary.title"
      descKey="nutri.mod.foodDiary.pageDesc"
    >
      {(chart) => <FoodDiaryReviewModule chart={chart} />}
    </NutritionChartWorkspace>
  );
}
