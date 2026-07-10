"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { VACCINE_CATALOG } from "@/lib/vaccine-schedule";

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

export default function VaccinationPanel({
  chartId,
  readOnly = false,
}: {
  chartId: string;
  readOnly?: boolean;
}) {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [vaccinations, setVaccinations] = useState<VaccinationItem[]>([]);
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

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-brand-500" size={24} />
      </div>
    );
  }

  return (
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
                  <span className="text-slate-400 font-normal"> — {v.doseNumber}ª dose</span>
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  {new Date(v.administeredAt).toLocaleDateString(locale)}
                  {" · "}
                  {t(`vac.network.${v.network.toLowerCase()}`)}
                  {v.batchNumber && ` — ${t("vac.batch")}: ${v.batchNumber}`}
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
  );
}
