"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { NurseChart } from "./NurseChartWorkspace";
import SaeModule from "./SaeModule";
import IntakeFormsModule from "./IntakeFormsModule";

export default function NurseSaeTabs({ chart }: { chart: NurseChart }) {
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
                ? "bg-rose-600 text-white border-rose-600"
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            {id === "full" ? t("nurse.sae.tabFull") : t("nurse.intake.tabQuestionnaires")}
          </button>
        ))}
      </div>
      {tab === "full" ? <SaeModule chart={chart} /> : <IntakeFormsModule chart={chart} />}
    </div>
  );
}
