import type { MealPlanMeal } from "./meal-plan-types";
import { sumMealPlanMacros } from "./meal-plan-types";
import { buildShoppingList } from "./shopping-list";

export function renderMealPlanHtml(params: {
  title: string;
  patientName: string;
  professionalName: string;
  notes: string | null;
  dailyKcalTarget: number | null;
  meals: MealPlanMeal[];
  lang: "pt" | "en" | "es";
}) {
  const { meals, title, patientName, professionalName, notes, dailyKcalTarget, lang } = params;
  const totals = sumMealPlanMacros(meals);
  const shopping = buildShoppingList(meals);
  const labels =
    lang === "pt"
      ? { plan: "Plano alimentar", patient: "Paciente", pro: "Nutricionista", notes: "Observações", target: "Meta kcal/dia", totals: "Totais", shopping: "Lista de compras", portion: "Porção" }
      : lang === "es"
        ? { plan: "Plan alimentario", patient: "Paciente", pro: "Nutricionista", notes: "Notas", target: "Meta kcal/día", totals: "Totales", shopping: "Lista de compras", portion: "Porción" }
        : { plan: "Meal plan", patient: "Patient", pro: "Nutritionist", notes: "Notes", target: "Daily kcal target", totals: "Totals", shopping: "Shopping list", portion: "Portion" };

  const mealRows = meals
    .map(
      (m) => `
      <div class="meal">
        <h3>${escapeHtml(m.name)}${m.time ? ` <span class="muted">(${escapeHtml(m.time)})</span>` : ""}</h3>
        <ul>${m.items.map((i) => `<li>${escapeHtml(i.foodName)} — ${i.portionG}g (${i.kcal} kcal)</li>`).join("")}</ul>
      </div>`,
    )
    .join("");

  const shopRows = shopping
    .map((s) => `<tr><td>${escapeHtml(s.foodName)}</td><td>${Math.round(s.totalPortionG)}g</td></tr>`)
    .join("");

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="UTF-8">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: Arial, sans-serif; font-size: 13px; color: #1a1a1a; padding: 32px; }
  h1 { color: #b45309; font-size: 22px; margin-bottom: 4px; }
  .meta { color: #64748b; font-size: 12px; margin-bottom: 20px; }
  .meal { margin-bottom: 16px; padding-bottom: 12px; border-bottom: 1px solid #e2e8f0; }
  .meal h3 { font-size: 14px; color: #92400e; margin-bottom: 6px; }
  .meal ul { margin: 0; padding-left: 18px; }
  .muted { color: #94a3b8; font-weight: normal; }
  table { width: 100%; border-collapse: collapse; margin-top: 8px; }
  th, td { border: 1px solid #e2e8f0; padding: 6px 8px; text-align: left; }
  th { background: #fffbeb; }
  @media print { body { padding: 16px; } }
</style>
</head>
<body>
  <h1>${labels.plan}: ${escapeHtml(title)}</h1>
  <div class="meta">${labels.patient}: ${escapeHtml(patientName)} · ${labels.pro}: ${escapeHtml(professionalName)}</div>
  ${dailyKcalTarget ? `<p><strong>${labels.target}:</strong> ${dailyKcalTarget} kcal</p>` : ""}
  ${notes ? `<p><strong>${labels.notes}:</strong> ${escapeHtml(notes)}</p>` : ""}
  <p><strong>${labels.totals}:</strong> ${Math.round(totals.kcal)} kcal · P ${totals.proteinG.toFixed(1)}g · C ${totals.carbsG.toFixed(1)}g · G ${totals.fatG.toFixed(1)}g</p>
  ${mealRows}
  <h2>${labels.shopping}</h2>
  <table><thead><tr><th>Item</th><th>${labels.portion}</th></tr></thead><tbody>${shopRows}</tbody></table>
</body>
</html>`;
}

function escapeHtml(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
