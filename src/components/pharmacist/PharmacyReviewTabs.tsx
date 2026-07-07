"use client";

import { useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { PharmacistChart } from "./PharmacistChartWorkspace";
import MedReviewModule from "./MedReviewModule";
import IntakeFormsModule from "./IntakeFormsModule";

export default function PharmacyReviewTabs({ chart }: { chart: PharmacistChart }) {
  const { t } = useI18n();
  const [tab, setTab] = useState<"review" | "intake">("review");

  return (
    <div className="space-y-4">
      <div className="flex gap-2">
        {(["review", "intake"] as const).map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setTab(id)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium border ${
              tab === id
                ? "bg-teal-600 text-white border-teal-600"
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            {id === "review" ? t("pharma.medReview.tabReview") : t("pharma.intake.tabQuestionnaires")}
          </button>
        ))}
      </div>
      {tab === "review" ? <MedReviewModule chart={chart} /> : <IntakeFormsModule chart={chart} />}
    </div>
  );
}
