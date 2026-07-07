"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { DentistChart } from "./DentistChartWorkspace";

type OrthoRecord = {
  id: string;
  applianceType: string;
  status: string;
  startDate: string | null;
  nextMaintenanceAt: string | null;
  alignerNumber: number | null;
};

export default function OrthodonticModule({ chart }: { chart: DentistChart }) {
  const { t } = useI18n();
  const [records, setRecords] = useState<OrthoRecord[]>([]);
  const [applianceType, setApplianceType] = useState("fixed");
  const [alignerNumber, setAlignerNumber] = useState("");
  const [saving, setSaving] = useState(false);

  function load() {
    fetch(`/api/dentist/charts/${chart.id}/orthodontics`)
      .then((r) => r.json())
      .then((data) => setRecords(data.records || []))
      .catch(() => {});
  }

  useEffect(() => { load(); }, [chart.id]);

  async function create() {
    setSaving(true);
    try {
      const res = await fetch(`/api/dentist/charts/${chart.id}/orthodontics`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applianceType,
          alignerNumber: alignerNumber ? Number(alignerNumber) : undefined,
        }),
      });
      if (res.ok) load();
    } finally {
      setSaving(false);
    }
  }

  async function recordMaintenance(recordId: string) {
    const now = new Date().toISOString();
    const next = new Date();
    next.setMonth(next.getMonth() + 1);
    await fetch(`/api/dentist/charts/${chart.id}/orthodontics`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        recordId,
        lastMaintenanceAt: now,
        nextMaintenanceAt: next.toISOString(),
      }),
    });
    load();
  }

  return (
    <div className="space-y-6">
      {records.map((rec) => (
        <div key={rec.id} className="rounded-xl border border-slate-200 bg-white p-4">
          <div className="flex justify-between gap-2">
            <div>
              <p className="font-medium text-slate-900">
                {t(`dental.ortho.appliance.${rec.applianceType}`)}
              </p>
              {rec.alignerNumber != null && (
                <p className="text-sm text-slate-500">
                  {t("dental.ortho.aligner")} #{rec.alignerNumber}
                </p>
              )}
            </div>
            <span className="text-xs font-medium px-2 py-1 rounded-full bg-violet-50 text-violet-700">
              {t(`dental.ortho.status.${rec.status.toLowerCase()}`)}
            </span>
          </div>
          {rec.nextMaintenanceAt && (
            <p className="text-xs text-slate-500 mt-2">
              {t("dental.ortho.nextMaintenance")}: {new Date(rec.nextMaintenanceAt).toLocaleDateString()}
            </p>
          )}
          <button
            type="button"
            onClick={() => recordMaintenance(rec.id)}
            className="mt-3 text-xs text-sky-600 hover:underline"
          >
            {t("dental.ortho.recordMaintenance")}
          </button>
        </div>
      ))}

      <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-3">
        <h3 className="font-semibold text-slate-900">{t("dental.ortho.new")}</h3>
        <select
          value={applianceType}
          onChange={(e) => setApplianceType(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          <option value="fixed">{t("dental.ortho.appliance.fixed")}</option>
          <option value="removable">{t("dental.ortho.appliance.removable")}</option>
          <option value="aligners">{t("dental.ortho.appliance.aligners")}</option>
        </select>
        {applianceType === "aligners" && (
          <input
            type="number"
            value={alignerNumber}
            onChange={(e) => setAlignerNumber(e.target.value)}
            placeholder={t("dental.ortho.alignerNumber")}
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
          />
        )}
        <button
          type="button"
          onClick={create}
          disabled={saving}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 text-white px-5 py-2.5 text-sm font-medium hover:bg-sky-700 disabled:opacity-50"
        >
          {saving ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />}
          {t("dental.ortho.create")}
        </button>
      </div>
    </div>
  );
}
