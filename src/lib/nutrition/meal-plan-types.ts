import { z } from "zod";

export const mealPlanItemSchema = z.object({
  foodId: z.string(),
  foodName: z.string(),
  portionG: z.number().positive(),
  kcal: z.number().nonnegative(),
  proteinG: z.number().nonnegative(),
  carbsG: z.number().nonnegative(),
  fatG: z.number().nonnegative(),
});

export const mealPlanMealSchema = z.object({
  name: z.string().min(1),
  time: z.string().optional(),
  items: z.array(mealPlanItemSchema),
});

export const mealPlanBodySchema = z.object({
  title: z.string().min(1).max(200),
  notes: z.string().max(5000).optional(),
  dailyKcalTarget: z.number().positive().optional(),
  meals: z.array(mealPlanMealSchema).min(1),
});

export type MealPlanItem = z.infer<typeof mealPlanItemSchema>;
export type MealPlanMeal = z.infer<typeof mealPlanMealSchema>;

export function sumMealPlanMacros(meals: MealPlanMeal[]) {
  return meals.reduce(
    (acc, meal) => {
      for (const item of meal.items) {
        acc.kcal += item.kcal;
        acc.proteinG += item.proteinG;
        acc.carbsG += item.carbsG;
        acc.fatG += item.fatG;
      }
      return acc;
    },
    { kcal: 0, proteinG: 0, carbsG: 0, fatG: 0 },
  );
}
