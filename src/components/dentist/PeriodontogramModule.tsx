"use client";

import { useEffect, useState } from "react";
import { Loader2, Save } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  PERIO_ARCHES,
  PERIO_SITES,
  parsePeriodontogramTeeth,
  type PeriodontogramData,
  type PerioSite,
} from "@/lib/dentistry/periodontogram";
import type { DentistChart } from "./DentistChartWorkspace";

export default function PeriodontogramModule({ chart }: { chart: DentistChart }) {
  const { t } = useI18n();
  const [teeth, setTeeth] = useState<PeriodontogramData>({});
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);

  useEffect(() => {
    fetch(`/api/dentist/charts/${chart.id}/periodontogram`)
      .then((r) => r.json())
      .then((data) => {
        const latest = data.records?.[0];
        if (latest) {
          setTeeth(parsePeriodontogramTeeth(latest.teeth));
          setNotes(latest.notes ?? "");
        }
      })
      .catch(() => {});
  }, [chart.id]);

  function updateSite(tooth: number, site: PerioSite, field: "depth" | "bleeding", value: number | boolean) {
    const key = String(tooth);
    const current = teeth[key] ?? { sites: {} };
    const siteData = current.sites?.[site] ?? {};
    setTeeth({
      ...teeth,
      [key]: {
        ...current,
        sites: {
          ...current.sites,
          [site]: { ...siteData, [field]: value },
        },
      },
    });
  }

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch(`/api/dentist/charts/${chart.id}/periodontogram`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teeth, notes }),
      });
      if (res.ok) setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 overflow-x-auto">
        {PERIO_ARCHES.map((arch) => (
          <div key={arch.labelKey} className="mb-4">
            <p className="text-xs font-semibold text-slate-500 mb-2">{t(arch.labelKey)}</p>
            <div className="flex gap-1">
              {arch.teeth.map((tooth) => {
                const key = String(tooth);
                const hasData = !!teeth[key];
                return (
                  <button
                    key={tooth}
                    type="button"
                    onClick={() => setSelectedTooth(tooth)}
                    className={`w-8 h-8 rounded text-xs font-medium border ${
                      selectedTooth === tooth
                        ? "bg-sky-600 text-white border-sky-600"
                        : hasData
                          ? "bg-rose-50 border-rose-300 text-rose-800"
                          : "bg-white border-slate-200 text-slate-600"
                    }`}
                  >
                    {tooth}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>

      {selectedTooth && (
        <div className="rounded-2xl border border-sky-200 bg-sky-50 p-4 space-y-3">
          <p className="text-sm font-semibold text-slate-800">
            {t("dental.perio.tooth")} {selectedTooth}
          </p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {PERIO_SITES.map((site) => (
              <div key={site} className="space-y-1">
                <label className="text-xs font-medium text-slate-600">{site}</label>
                <input
                  type="number"
                  min={0}
                  max={15}
                  placeholder="mm"
                  value={teeth[String(selectedTooth)]?.sites?.[site]?.depth ?? ""}
                  onChange={(e) =>
                    updateSite(selectedTooth, site, "depth", Number(e.target.value) || 0)
                  }
                  className="w-full rounded-lg border border-slate-200 px-2 py-1 text-sm"
                />
                <label className="flex items-center gap-1 text-xs">
                  <input
                    type="checkbox"
                    checked={teeth[String(selectedTooth)]?.sites?.[site]?.bleeding ?? false}
                    onChange={(e) => updateSite(selectedTooth, site, "bleeding", e.target.checked)}
                  />
                  {t("dental.perio.bleeding")}
                </label>
              </div>
            ))}
          </div>
        </div>
      )}

      <textarea
        value={notes}
        onChange={(e) => setNotes(e.target.value)}
        placeholder={t("dental.perio.notes")}
        className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm min-h-[80px]"
      />

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
          {t("dental.perio.save")}
        </button>
        {saved && <span className="text-sm text-emerald-600">{t("dental.perio.saved")}</span>}
      </div>
    </div>
  );
}
