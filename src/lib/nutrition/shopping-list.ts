import type { MealPlanMeal } from "./meal-plan-types";

export type ShoppingItem = {
  foodName: string;
  totalPortionG: number;
  occurrences: number;
};

export function buildShoppingList(meals: MealPlanMeal[]): ShoppingItem[] {
  const map = new Map<string, ShoppingItem>();
  for (const meal of meals) {
    for (const item of meal.items) {
      const key = item.foodName.trim().toLowerCase();
      const existing = map.get(key);
      if (existing) {
        existing.totalPortionG += item.portionG;
        existing.occurrences += 1;
      } else {
        map.set(key, {
          foodName: item.foodName,
          totalPortionG: item.portionG,
          occurrences: 1,
        });
      }
    }
  }
  return [...map.values()].sort((a, b) => a.foodName.localeCompare(b.foodName));
}
