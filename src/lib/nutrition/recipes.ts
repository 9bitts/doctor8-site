export type NutritionRecipe = {
  id: string;
  nameKey: string;
  descKey: string;
  prepMinutes: number;
  foodIds: string[];
  stepsKey: string;
};

export const NUTRITION_RECIPES: NutritionRecipe[] = [
  {
    id: "overnight-oats",
    nameKey: "nutri.recipe.overnightOats",
    descKey: "nutri.recipe.overnightOats.desc",
    prepMinutes: 5,
    foodIds: ["aveia-flocos", "iogurte-natural-desnatado", "banana-prata"],
    stepsKey: "nutri.recipe.overnightOats.steps",
  },
  {
    id: "grilled-chicken-salad",
    nameKey: "nutri.recipe.chickenSalad",
    descKey: "nutri.recipe.chickenSalad.desc",
    prepMinutes: 20,
    foodIds: ["frango-peito-grelhado", "alface-crua", "tomate-cru", "azeite-extra-virgem"],
    stepsKey: "nutri.recipe.chickenSalad.steps",
  },
  {
    id: "rice-beans-bowl",
    nameKey: "nutri.recipe.riceBeans",
    descKey: "nutri.recipe.riceBeans.desc",
    prepMinutes: 25,
    foodIds: ["arroz-branco-cozido", "feijao-carioca-cozido", "brocolis-cozido"],
    stepsKey: "nutri.recipe.riceBeans.steps",
  },
];
