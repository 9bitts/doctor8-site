"use client";

import { useState, useEffect } from "react";
import { Loader2, Syringe, Plus, Trash2, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { VACCINE_CATALOG, type ScheduleRow } from "@/lib/vaccine-schedule";

type VaccinationItem = {
  id: string;
  vaccineCode: string;
  vaccineName: string;
  doseNumber: number;
  administeredAt: string;
  network: string;
  batchNumber: string | null;
  manufacturer: string | null;
  applicationSite: string | null;
  notes: string | null;
};

const STATUS_CLASS: Record<string, string> = {
  done: "bg-emerald-50 text-emerald-700 border-emerald-200",
  pending: "bg-amber-50 text-amber-800 border-amber-200",
  overdue: "bg-rose-50 text-rose-700 border-rose-200",
  upcoming: "bg-slate-50 text-slate-500 border-slate-200",
};

export default function VaccinationPanel({
  chartId,
  dateOfBirth,
  readOnly = false,
}: {
  chartId: string;
  dateOfBirth?: string;
  readOnly?: boolean;
}) {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [vaccinations, setVaccinations] = useState<VaccinationItem[]>([]);
  const [schedule, setSchedule] = useState<ScheduleRow[]>([]);
  const [hasDob, setHasDob] = useState(!!dateOfBirth);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const [vaccineCode, setVaccineCode] = useState(VACCINE_CATALOG[0]?.code ?? "BCG");
  const [doseNumber, setDoseNumber] = useState(1);
  const [administeredAt, setAdministeredAt] = useState(new Date().toISOString().slice(0, 10));
  const [network, setNetwork] = useState<"PUBLIC" | "PRIVATE" | "OTHER">("PUBLIC");
  const [batchNumber, setBatchNumber] = useState("");
  const [notes, setNotes] = useState("");

  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/professional/records/${chartId}/vaccinations`);
      const data = await res.json();
      if (res.ok) {
        setVaccinations(data.vaccinations || []);
        setSchedule(data.schedule || []);
        setHasDob(!!data.dateOfBirth);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, [chartId]);

  async function addVaccination() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/professional/records/${chartId}/vaccinations`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vaccineCode,
          doseNumber,
          administeredAt,
          network,
          batchNumber: batchNumber || undefined,
          notes: notes || undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : t("vac.saveError"));
      setShowForm(false);
      setBatchNumber("");
      setNotes("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("vac.saveError"));
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm(t("vac.confirmDelete"))) return;
    const res = await fetch(`/api/professional/records/${chartId}/vaccinations/${id}`, {
      method: "DELETE",
    });
    if (res.ok) await load();
  }

  const overdueCount = schedule.filter((s) => s.status === "overdue").length;
  const pendingCount = schedule.filter((s) => s.status === "pending").length;

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-brand-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!hasDob && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {t("vac.noDobHint")}
        </div>
      )}

      {(overdueCount > 0 || pendingCount > 0) && hasDob && (
        <div className="flex flex-wrap gap-2">
          {overdueCount > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200">
              {t("vac.overdueCount").replace("{n}", String(overdueCount))}
            </span>
          )}
          {pendingCount > 0 && (
            <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {t("vac.pendingCount").replace("{n}", String(pendingCount))}
            </span>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Syringe size={16} className="text-brand-500" /> {t("vac.scheduleTitle")}
          </p>
          <span className="text-[10px] text-slate-400 uppercase">{t("vac.pniLabel")}</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b border-slate-100">
                <th className="px-4 py-2 font-medium">{t("vac.col.vaccine")}</th>
                <th className="px-4 py-2 font-medium">{t("vac.col.dose")}</th>
                <th className="px-4 py-2 font-medium">{t("vac.col.recommended")}</th>
                <th className="px-4 py-2 font-medium">{t("vac.col.status")}</th>
                <th className="px-4 py-2 font-medium">{t("vac.col.given")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {schedule.map((row) => (
                <tr key={`${row.vaccineCode}-${row.doseNumber}`} className="hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 text-slate-800">{row.vaccineName}</td>
                  <td className="px-4 py-2.5 text-slate-600">{row.doseNumber}?</td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {row.recommendedDate
                      ? new Date(row.recommendedDate + "T12:00:00").toLocaleDateString(locale)
                      : "?"}
                  </td>
                  <td className="px-4 py-2.5">
                    <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-full border ${STATUS_CLASS[row.status]}`}>
                      {t(`vac.status.${row.status}`)}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-slate-500">
                    {row.administeredAt
                      ? new Date(row.administeredAt + "T12:00:00").toLocaleDateString(locale)
                      : "?"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-slate-800">{t("vac.historyTitle")}</p>
          {!readOnly && !showForm && (
            <button
              type="button"
              onClick={() => setShowForm(true)}
              className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700"
            >
              <Plus size={14} /> {t("vac.add")}
            </button>
          )}
        </div>

        {showForm && !readOnly && (
          <div className="px-4 py-4 border-b border-slate-100 bg-slate-50 space-y-3">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("vac.col.vaccine")}</label>
                <select
                  value={vaccineCode}
                  onChange={(e) => setVaccineCode(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                >
                  {VACCINE_CATALOG.map((v) => (
                    <option key={v.code} value={v.code}>{v.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("vac.col.dose")}</label>
                <input
                  type="number"
                  min={1}
                  max={20}
                  value={doseNumber}
                  onChange={(e) => setDoseNumber(Number(e.target.value))}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("vac.col.given")}</label>
                <input
                  type="date"
                  value={administeredAt}
                  onChange={(e) => setAdministeredAt(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("vac.network")}</label>
                <select
                  value={network}
                  onChange={(e) => setNetwork(e.target.value as typeof network)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                >
                  <option value="PUBLIC">{t("vac.network.public")}</option>
                  <option value="PRIVATE">{t("vac.network.private")}</option>
                  <option value="OTHER">{t("vac.network.other")}</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("vac.batch")}</label>
                <input
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                  placeholder={t("vac.batchPlaceholder")}
                />
              </div>
            </div>
            {error && <p className="text-xs text-rose-600">{error}</p>}
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => { setShowForm(false); setError(""); }}
                className="flex-1 py-2 rounded-xl border border-slate-200 text-sm text-slate-600"
              >
                {t("common.cancel")}
              </button>
              <button
                type="button"
                onClick={addVaccination}
                disabled={saving}
                className="flex-1 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
              >
                {saving && <Loader2 size={14} className="animate-spin" />}
                {t("vac.save")}
              </button>
            </div>
          </div>
        )}

        {vaccinations.length === 0 ? (
          <p className="px-4 py-8 text-center text-sm text-slate-400">{t("vac.empty")}</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {vaccinations.map((v) => (
              <li key={v.id} className="px-4 py-3 flex items-start gap-3">
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-sm text-slate-800">
                    {v.vaccineName}
                    <span className="text-slate-400 font-normal"> ? {v.doseNumber}? dose</span>
                  </p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    {new Date(v.administeredAt).toLocaleDateString(locale)}
                    {" ? "}
                    {t(`vac.network.${v.network.toLowerCase()}`)}
                    {v.batchNumber && ` ? ${t("vac.batch")}: ${v.batchNumber}`}
                  </p>
                  {v.notes && <p className="text-xs text-slate-500 mt-1">{v.notes}</p>}
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => remove(v.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 rounded-lg"
                    title={t("vac.delete")}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
