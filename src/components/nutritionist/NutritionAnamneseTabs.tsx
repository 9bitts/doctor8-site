"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { NutritionChart } from "./NutritionChartWorkspace";
import FoodAnamnesisModule from "./FoodAnamnesisModule";
import IntakeFormsModule from "./IntakeFormsModule";

export default function NutritionAnamneseTabs({ chart }: { chart: NutritionChart }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"full" | "intake">("full");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["full", "intake"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border ${
              tab === id
                ? "bg-amber-600 text-white border-amber-600"
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            {id === "full" ? t("nutri.anam.tabFull") : t("nutri.intake.tabQuestionnaires")}
          </button>
        ))}
      </div>
      {tab === "full" ? <FoodAnamnesisModule chart={chart} /> : <IntakeFormsModule chart={chart} />}
    </div>
  );
}
