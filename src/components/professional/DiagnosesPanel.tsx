"use client";

import { useState, useEffect } from "react";
import { Loader2, Stethoscope, CheckCircle2, RotateCcw, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import CidSearchInput, { type CidSelection } from "@/components/CidSearchInput";

export type DiagnosisItem = {
  id: string;
  cidCode: string;
  cidLabel: string | null;
  status: "ACTIVE" | "RESOLVED";
  notedAt: string;
  resolvedAt: string | null;
};

export default function DiagnosesPanel({ chartId, readOnly = false }: { chartId: string; readOnly?: boolean }) {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [diagnoses, setDiagnoses] = useState<DiagnosisItem[]>([]);
  const [cidSelection, setCidSelection] = useState<CidSelection | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/professional/records/${chartId}/diagnoses`);
      const data = await res.json();
      setDiagnoses(data.diagnoses || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, [chartId]);

  async function addDiagnosis() {
    if (!cidSelection) {
      setError(t("diag.needCid"));
      return;
    }
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/professional/records/${chartId}/diagnoses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          cidCode: cidSelection.code,
          cidLabel: cidSelection.description,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t("diag.saveError"));
      setCidSelection(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : t("diag.saveError"));
    } finally {
      setSaving(false);
    }
  }

  async function setStatus(id: string, status: "ACTIVE" | "RESOLVED") {
    const res = await fetch(`/api/professional/records/${chartId}/diagnoses/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    if (res.ok) await load();
  }

  async function remove(id: string) {
    if (!confirm(t("diag.confirmDelete"))) return;
    const res = await fetch(`/api/professional/records/${chartId}/diagnoses/${id}`, {
      method: "DELETE",
    });
    if (res.ok) await load();
  }

  const active = diagnoses.filter((d) => d.status === "ACTIVE");
  const resolved = diagnoses.filter((d) => d.status === "RESOLVED");

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-brand-500" size={24} />
      </div>
    );
  }

  function renderList(items: DiagnosisItem[], resolvedList: boolean) {
    if (items.length === 0) return null;
    return (
      <ul className="divide-y divide-slate-100">
        {items.map((d) => (
          <li key={d.id} className="px-4 py-3 flex items-start gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-semibold text-sm text-slate-800">
                {d.cidCode}
                {d.cidLabel ? <span className="font-normal text-slate-600"> ? {d.cidLabel}</span> : null}
              </p>
              <p className="text-xs text-slate-400 mt-0.5">
                {new Date(d.notedAt).toLocaleDateString(locale)}
                {d.resolvedAt && resolvedList && (
                  <> ? {t("diag.resolvedOn")} {new Date(d.resolvedAt).toLocaleDateString(locale)}</>
                )}
              </p>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              {!readOnly && (
              <>
              {d.status === "ACTIVE" ? (
                <button
                  type="button"
                  onClick={() => setStatus(d.id, "RESOLVED")}
                  className="p-2 text-slate-400 hover:text-brand-600 rounded-lg"
                  title={t("diag.markResolved")}
                >
                  <CheckCircle2 size={16} />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => setStatus(d.id, "ACTIVE")}
                  className="p-2 text-slate-400 hover:text-brand-600 rounded-lg"
                  title={t("diag.reactivate")}
                >
                  <RotateCcw size={16} />
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(d.id)}
                className="p-2 text-slate-400 hover:text-rose-500 rounded-lg"
                title={t("diag.delete")}
              >
                <Trash2 size={16} />
              </button>
              </>
              )}
            </div>
          </li>
        ))}
      </ul>
    );
  }

  return (
    <div className="space-y-4">
      {!readOnly && (
      <div className="bg-white rounded-2xl border border-slate-100 p-5 space-y-3">
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Stethoscope size={16} className="text-brand-500" /> {t("diag.addTitle")}
        </p>
        <CidSearchInput value={cidSelection} onChange={setCidSelection} required={false} />
        {error && <p className="text-xs text-rose-600">{error}</p>}
        <button
          type="button"
          onClick={addDiagnosis}
          disabled={saving || !cidSelection}
          className="text-sm font-semibold bg-brand-500 text-white px-4 py-2 rounded-xl disabled:opacity-50 flex items-center gap-2"
        >
          {saving && <Loader2 size={14} className="animate-spin" />}
          {t("diag.add")}
        </button>
      </div>
      )}

      {active.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <p className="px-4 py-2 text-xs font-bold text-brand-700 bg-brand-50 uppercase tracking-wide">
            {t("diag.active")} ({active.length})
          </p>
          {renderList(active, false)}
        </div>
      )}

      {resolved.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <p className="px-4 py-2 text-xs font-bold text-slate-500 bg-slate-50 uppercase tracking-wide">
            {t("diag.resolved")} ({resolved.length})
          </p>
          {renderList(resolved, true)}
        </div>
      )}

      {diagnoses.length === 0 && (
        <p className="text-sm text-slate-400 text-center py-6">{t("diag.empty")}</p>
      )}
    </div>
  );
}
