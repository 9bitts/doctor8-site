"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import OdontogramPanel from "@/components/professional/OdontogramPanel";
import type { DentistChart } from "./DentistChartWorkspace";
import type { DentitionType } from "@/lib/odontogram";

export default function OdontogramModule({ chart }: { chart: DentistChart }) {
  const { t } = useI18n();
  const [dentitionType, setDentitionType] = useState<DentitionType>("PERMANENT");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/dentist/charts/${chart.id}/odontogram`)
      .then((r) => r.json())
      .then((data) => {
        if (data.dentitionType) setDentitionType(data.dentitionType);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [chart.id]);

  async function updateDentition(type: DentitionType) {
    setDentitionType(type);
    await fetch(`/api/dentist/charts/${chart.id}/odontogram`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dentitionType: type }),
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-sky-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {(["PERMANENT", "DECIDUOUS", "MIXED"] as DentitionType[]).map((type) => (
          <button
            key={type}
            type="button"
            onClick={() => updateDentition(type)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition ${
              dentitionType === type
                ? "bg-sky-600 text-white border-sky-600"
                : "bg-white text-slate-600 border-slate-200 hover:border-sky-300"
            }`}
          >
            {t(`dental.dentition.${type.toLowerCase()}`)}
          </button>
        ))}
      </div>
      <OdontogramPanel chartId={chart.id} readOnly={false} />
    </div>
  );
}
