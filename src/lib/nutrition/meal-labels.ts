import type { Lang } from "@/lib/i18n/translations";

const MEAL_LABELS: Record<Lang, string[]> = {
  pt: ["Café da manhã", "Lanche da manhã", "Almoço", "Lanche da tarde", "Jantar", "Ceia"],
  en: ["Breakfast", "Morning snack", "Lunch", "Afternoon snack", "Dinner", "Supper"],
  es: ["Desayuno", "Merienda mañana", "Almuerzo", "Merienda tarde", "Cena", "Ceja"],
};

export function defaultMealNames(lang: Lang): string[] {
  return MEAL_LABELS[lang] ?? MEAL_LABELS.en;
}
