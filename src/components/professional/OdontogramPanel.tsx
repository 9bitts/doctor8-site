"use client";

import { useState, useEffect, useCallback } from "react";
import { Loader2, Save, X, Grid3X3 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  CONDITION_STYLE,
  ODONTOGRAM_ARCHES,
  ODONTOGRAM_CONDITIONS,
  TOOTH_SURFACES,
  countByCondition,
  getToothState,
  type OdontogramCondition,
  type OdontogramData,
  type ToothState,
  type ToothSurface,
} from "@/lib/odontogram";

function ToothButton({
  tooth,
  state,
  selected,
  readOnly,
  onClick,
}: {
  tooth: number;
  state: ToothState;
  selected: boolean;
  readOnly: boolean;
  onClick: () => void;
}) {
  const style = CONDITION_STYLE[state.condition];
  const missing = state.condition === "MISSING";

  return (
    <button
      type="button"
      disabled={readOnly}
      onClick={onClick}
      title={String(tooth)}
      className={`relative w-9 h-11 sm:w-10 sm:h-12 rounded-lg border text-[10px] sm:text-xs font-bold transition ${
        style.bg
      } ${style.border} ${style.text} ${
        selected ? "ring-2 ring-brand-500 ring-offset-1" : "hover:brightness-95"
      } ${readOnly ? "cursor-default" : "cursor-pointer"}`}
    >
      {missing ? (
        <span className="text-slate-300 line-through">{tooth}</span>
      ) : (
        <>
          <span>{tooth}</span>
          {state.condition !== "HEALTHY" && (
            <span className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${style.dot}`} />
          )}
          {state.surfaces && state.surfaces.length > 0 && (
            <span className="absolute bottom-0.5 left-0 right-0 text-[7px] font-normal opacity-70 truncate px-0.5">
              {state.surfaces.join("")}
            </span>
          )}
        </>
      )}
    </button>
  );
}

export default function OdontogramPanel({
  chartId,
  readOnly = false,
}: {
  chartId: string;
  readOnly?: boolean;
}) {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [teeth, setTeeth] = useState<OdontogramData>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [selectedTooth, setSelectedTooth] = useState<number | null>(null);
  const [draft, setDraft] = useState<ToothState | null>(null);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/professional/records/${chartId}/odontogram`);
      const data = await res.json();
      if (res.ok) {
        setTeeth(data.teeth || {});
        setGeneralNotes(data.generalNotes || "");
        setUpdatedAt(data.updatedAt);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }, [chartId]);

  useEffect(() => { load(); }, [load]);

  function openTooth(tooth: number) {
    if (readOnly) return;
    setSelectedTooth(tooth);
    setDraft({ ...getToothState(teeth, tooth), surfaces: [...(getToothState(teeth, tooth).surfaces || [])] });
    setError("");
  }

  function applyDraft() {
    if (selectedTooth == null || !draft) return;
    const key = String(selectedTooth);
    setTeeth((prev) => {
      const next = { ...prev };
      if (draft.condition === "HEALTHY" && !draft.notes && (!draft.surfaces || draft.surfaces.length === 0)) {
        delete next[key];
      } else {
        next[key] = {
          condition: draft.condition,
          ...(draft.surfaces && draft.surfaces.length > 0 ? { surfaces: draft.surfaces } : {}),
          ...(draft.notes?.trim() ? { notes: draft.notes.trim() } : {}),
        };
      }
      return next;
    });
    setSelectedTooth(null);
    setDraft(null);
  }

  function toggleSurface(s: ToothSurface) {
    if (!draft) return;
    const surfaces = draft.surfaces || [];
    setDraft({
      ...draft,
      surfaces: surfaces.includes(s) ? surfaces.filter((x) => x !== s) : [...surfaces, s],
    });
  }

  async function save() {
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch(`/api/professional/records/${chartId}/odontogram`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ teeth, generalNotes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : t("odonto.saveError"));
      setTeeth(data.teeth || {});
      setGeneralNotes(data.generalNotes || "");
      setUpdatedAt(data.updatedAt);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("odonto.saveError"));
    }
    setSaving(false);
  }

  const summary = countByCondition(teeth);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-brand-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-2xl border border-slate-100 p-4 sm:p-6">
        <div className="flex items-center justify-between gap-2 mb-4">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <Grid3X3 size={16} className="text-brand-500" />
            {t("odonto.title")}
          </p>
          <span className="text-[10px] text-slate-400 uppercase">{t("odonto.fdi")}</span>
        </div>

        <div className="space-y-6">
          {ODONTOGRAM_ARCHES.map((arch) => (
            <div key={arch.labelKey}>
              <p className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide mb-2 text-center">
                {t(arch.labelKey)}
              </p>
              <div className="flex flex-wrap justify-center gap-1 sm:gap-1.5">
                {arch.teeth.map((tooth, i) => (
                  <div key={tooth} className="flex items-center">
                    {i === 8 && <div className="w-2 sm:w-4" aria-hidden />}
                    <ToothButton
                      tooth={tooth}
                      state={getToothState(teeth, tooth)}
                      selected={selectedTooth === tooth}
                      readOnly={readOnly}
                      onClick={() => openTooth(tooth)}
                    />
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="mt-5 flex flex-wrap gap-2 justify-center">
          {ODONTOGRAM_CONDITIONS.filter((c) => c !== "HEALTHY").map((c) => (
            <span
              key={c}
              className={`inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-1 rounded-full border ${
                CONDITION_STYLE[c].bg
              } ${CONDITION_STYLE[c].border} ${CONDITION_STYLE[c].text}`}
            >
              <span className={`w-1.5 h-1.5 rounded-full ${CONDITION_STYLE[c].dot}`} />
              {t(`odonto.cond.${c}`)}
              {(summary[c] ?? 0) > 0 && (
                <span className="opacity-70">({summary[c]})</span>
              )}
            </span>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-3">
        <label className="block text-xs font-medium text-slate-600">{t("odonto.generalNotes")}</label>
        <textarea
          value={generalNotes}
          onChange={(e) => setGeneralNotes(e.target.value)}
          readOnly={readOnly}
          rows={3}
          placeholder={t("odonto.generalNotesPlaceholder")}
          className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-brand-100 disabled:bg-slate-50"
        />
        {!readOnly && (
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={save}
              disabled={saving}
              className="inline-flex items-center gap-2 bg-brand-500 text-white text-sm font-semibold px-4 py-2 rounded-xl disabled:opacity-50"
            >
              {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
              {t("odonto.save")}
            </button>
            {saved && <span className="text-xs text-brand-600">{t("odonto.saved")}</span>}
            {error && <span className="text-xs text-rose-600">{error}</span>}
          </div>
        )}
        {updatedAt && (
          <p className="text-[10px] text-slate-400">
            {t("odonto.updated")}: {new Date(updatedAt).toLocaleString()}
          </p>
        )}
      </div>

      {selectedTooth != null && draft && !readOnly && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/40">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-slate-900">
                {t("odonto.tooth")} {selectedTooth}
              </h3>
              <button type="button" onClick={() => { setSelectedTooth(null); setDraft(null); }} className="text-slate-400 hover:text-slate-600">
                <X size={18} />
              </button>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t("odonto.condition")}</label>
              <select
                value={draft.condition}
                onChange={(e) => setDraft({ ...draft, condition: e.target.value as OdontogramCondition })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
              >
                {ODONTOGRAM_CONDITIONS.map((c) => (
                  <option key={c} value={c}>{t(`odonto.cond.${c}`)}</option>
                ))}
              </select>
            </div>

            {(draft.condition === "CARIES" || draft.condition === "RESTORATION") && (
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">{t("odonto.surfaces")}</label>
                <div className="flex flex-wrap gap-2">
                  {TOOTH_SURFACES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSurface(s)}
                      className={`text-xs font-semibold px-3 py-1.5 rounded-lg border transition ${
                        draft.surfaces?.includes(s)
                          ? "bg-brand-500 text-white border-brand-500"
                          : "bg-white text-slate-600 border-slate-200"
                      }`}
                    >
                      {t(`odonto.surface.${s}`)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t("odonto.notes")}</label>
              <input
                value={draft.notes || ""}
                onChange={(e) => setDraft({ ...draft, notes: e.target.value })}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
                placeholder={t("odonto.notesPlaceholder")}
              />
            </div>

            <button
              type="button"
              onClick={applyDraft}
              className="w-full py-2.5 rounded-xl bg-brand-500 text-white text-sm font-semibold"
            >
              {t("odonto.apply")}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
