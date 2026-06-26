"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, Ear, Plus, Trash2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  AUDIO_FREQS,
  chartPoints,
  classifyHearing,
  computePta,
  emptyThresholds,
  type AudiogramThresholds,
  type EarThresholds,
} from "@/lib/audiometry";

type AudiogramItem = {
  id: string;
  testedAt: string;
  thresholds: AudiogramThresholds;
  notes: string | null;
};

const GRADE_CLASS: Record<string, string> = {
  NORMAL: "bg-emerald-50 text-emerald-700 border-emerald-200",
  MILD: "bg-sky-50 text-sky-800 border-sky-200",
  MODERATE: "bg-amber-50 text-amber-800 border-amber-200",
  SEVERE: "bg-orange-50 text-orange-800 border-orange-200",
  PROFOUND: "bg-rose-50 text-rose-800 border-rose-200",
};

function AudiogramChart({ thresholds }: { thresholds: AudiogramThresholds }) {
  const width = 480;
  const height = 260;
  const pad = { t: 20, r: 24, b: 36, l: 44 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;
  const dbMin = -10;
  const dbMax = 100;

  const toX = (freqIndex: number) =>
    pad.l + (freqIndex / (AUDIO_FREQS.length - 1)) * innerW;
  const toY = (db: number) =>
    pad.t + ((db - dbMin) / (dbMax - dbMin)) * innerH;

  const rightAc = chartPoints(thresholds.right, "ac");
  const leftAc = chartPoints(thresholds.left, "ac");
  const rightBc = chartPoints(thresholds.right, "bc");
  const leftBc = chartPoints(thresholds.left, "bc");

  const freqIndex = (f: number) => AUDIO_FREQS.indexOf(f as typeof AUDIO_FREQS[number]);

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-lg mx-auto" role="img">
      {[0, 20, 40, 60, 80, 100].map((db) => (
        <g key={db}>
          <line
            x1={pad.l}
            y1={toY(db)}
            x2={width - pad.r}
            y2={toY(db)}
            stroke="#f1f5f9"
            strokeDasharray={db === 20 ? undefined : "2 4"}
          />
          <text x={pad.l - 6} y={toY(db) + 3} textAnchor="end" fontSize="9" fill="#94a3b8">
            {db}
          </text>
        </g>
      ))}
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + innerH} stroke="#e2e8f0" />
      <line x1={pad.l} y1={pad.t + innerH} x2={width - pad.r} y2={pad.t + innerH} stroke="#e2e8f0" />

      {AUDIO_FREQS.map((f, i) => (
        <text key={f} x={toX(i)} y={height - 10} textAnchor="middle" fontSize="9" fill="#94a3b8">
          {f >= 1000 ? `${f / 1000}k` : f}
        </text>
      ))}

      {rightAc.length > 1 && (
        <polyline
          fill="none"
          stroke="#e11d48"
          strokeWidth="1.5"
          points={rightAc.map((p) => `${toX(freqIndex(p.freq))},${toY(p.db)}`).join(" ")}
        />
      )}
      {leftAc.length > 1 && (
        <polyline
          fill="none"
          stroke="#2563eb"
          strokeWidth="1.5"
          points={leftAc.map((p) => `${toX(freqIndex(p.freq))},${toY(p.db)}`).join(" ")}
        />
      )}

      {rightAc.map((p) => (
        <circle key={`r-ac-${p.freq}`} cx={toX(freqIndex(p.freq))} cy={toY(p.db)} r="5" fill="none" stroke="#e11d48" strokeWidth="2" />
      ))}
      {leftAc.map((p) => {
        const x = toX(freqIndex(p.freq));
        const y = toY(p.db);
        return (
          <g key={`l-ac-${p.freq}`}>
            <line x1={x - 4} y1={y - 4} x2={x + 4} y2={y + 4} stroke="#2563eb" strokeWidth="2" />
            <line x1={x + 4} y1={y - 4} x2={x - 4} y2={y + 4} stroke="#2563eb" strokeWidth="2" />
          </g>
        );
      })}

      {rightBc.map((p) => (
        <polygon
          key={`r-bc-${p.freq}`}
          points={`${toX(freqIndex(p.freq))},${toY(p.db) - 5} ${toX(freqIndex(p.freq)) - 4},${toY(p.db) + 4} ${toX(freqIndex(p.freq)) + 4},${toY(p.db) + 4}`}
          fill="none"
          stroke="#e11d48"
          strokeWidth="1.5"
        />
      ))}
      {leftBc.map((p) => {
        const x = toX(freqIndex(p.freq));
        const y = toY(p.db);
        return (
          <g key={`l-bc-${p.freq}`}>
            <line x1={x - 5} y1={y} x2={x + 5} y2={y} stroke="#2563eb" strokeWidth="2" />
            <line x1={x - 5} y1={y - 4} x2={x - 5} y2={y + 4} stroke="#2563eb" strokeWidth="2" />
            <line x1={x + 5} y1={y - 4} x2={x + 5} y2={y + 4} stroke="#2563eb" strokeWidth="2" />
          </g>
        );
      })}
    </svg>
  );
}

function ThresholdGrid({
  label,
  ear,
  conduction,
  value,
  onChange,
  readOnly,
}: {
  label: string;
  ear: "right" | "left";
  conduction: "ac" | "bc";
  value: EarThresholds;
  onChange: (ear: "right" | "left", conduction: "ac" | "bc", freq: string, raw: string) => void;
  readOnly: boolean;
}) {
  const map = conduction === "ac" ? value.ac : value.bc;

  return (
    <tr>
      <td className="px-2 py-1.5 text-xs font-medium text-slate-600 whitespace-nowrap">{label}</td>
      {AUDIO_FREQS.map((f) => {
        const key = String(f);
        return (
          <td key={key} className="px-1 py-1">
            <input
              type="number"
              min={-10}
              max={120}
              step={5}
              disabled={readOnly}
              value={map?.[key] ?? ""}
              onChange={(e) => onChange(ear, conduction, key, e.target.value)}
              className="w-full min-w-[44px] border border-slate-200 rounded-lg px-1 py-1 text-xs text-center disabled:bg-slate-50"
              placeholder="?"
            />
          </td>
        );
      })}
    </tr>
  );
}

export default function AudiogramPanel({
  chartId,
  readOnly = false,
}: {
  chartId: string;
  readOnly?: boolean;
}) {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AudiogramItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [testedAt, setTestedAt] = useState(new Date().toISOString().slice(0, 10));
  const [draft, setDraft] = useState<AudiogramThresholds>(emptyThresholds());
  const [notes, setNotes] = useState("");

  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/professional/records/${chartId}/audiograms`);
      const data = await res.json();
      if (res.ok) {
        const list = data.audiograms || [];
        setItems(list);
        if (list.length > 0 && !selectedId) setSelectedId(list[0].id);
      }
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, [chartId]);

  const selected = useMemo(
    () => items.find((i) => i.id === selectedId) ?? items[0] ?? null,
    [items, selectedId],
  );

  function setThreshold(
    ear: "right" | "left",
    conduction: "ac" | "bc",
    freq: string,
    raw: string,
  ) {
    setDraft((prev) => {
      const next = { ...prev, [ear]: { ...prev[ear] } };
      const map = { ...(next[ear][conduction] || {}) };
      if (raw === "") delete map[freq];
      else {
        const n = Number(raw);
        if (Number.isFinite(n)) map[freq] = n;
      }
      next[ear] = {
        ...next[ear],
        [conduction]: Object.keys(map).length > 0 ? map : undefined,
      };
      return next;
    });
  }

  async function save() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch(`/api/professional/records/${chartId}/audiograms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ testedAt, thresholds: draft, notes }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(typeof data.error === "string" ? data.error : t("audio.saveError"));
      setShowForm(false);
      setDraft(emptyThresholds());
      setNotes("");
      await load();
      if (data.id) setSelectedId(data.id);
    } catch (e) {
      setError(e instanceof Error ? e.message : t("audio.saveError"));
    }
    setSaving(false);
  }

  async function remove(id: string) {
    if (!confirm(t("audio.confirmDelete"))) return;
    const res = await fetch(`/api/professional/records/${chartId}/audiograms/${id}`, {
      method: "DELETE",
    });
    if (res.ok) {
      setItems((prev) => prev.filter((i) => i.id !== id));
      if (selectedId === id) setSelectedId(null);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-brand-500" size={24} />
      </div>
    );
  }

  const rightPta = selected ? computePta(selected.thresholds.right) : null;
  const leftPta = selected ? computePta(selected.thresholds.left) : null;
  const rightGrade = classifyHearing(rightPta);
  const leftGrade = classifyHearing(leftPta);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
          <Ear size={16} className="text-brand-500" /> {t("audio.title")}
        </p>
        {!readOnly && !showForm && (
          <button
            type="button"
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-1 text-xs font-semibold text-brand-600"
          >
            <Plus size={14} /> {t("audio.add")}
          </button>
        )}
      </div>

      {showForm && !readOnly && (
        <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">{t("audio.testDate")}</label>
              <input
                type="date"
                value={testedAt}
                onChange={(e) => setTestedAt(e.target.value)}
                className="border border-slate-200 rounded-xl px-3 py-2 text-sm"
              />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-sm border-collapse">
              <thead>
                <tr className="text-[10px] text-slate-500">
                  <th className="text-left px-2 py-1" />
                  {AUDIO_FREQS.map((f) => (
                    <th key={f} className="px-1 py-1 font-medium">{f}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                <ThresholdGrid label={t("audio.odAc")} ear="right" conduction="ac" value={draft.right} onChange={setThreshold} readOnly={false} />
                <ThresholdGrid label={t("audio.oeAc")} ear="left" conduction="ac" value={draft.left} onChange={setThreshold} readOnly={false} />
                <ThresholdGrid label={t("audio.odBc")} ear="right" conduction="bc" value={draft.right} onChange={setThreshold} readOnly={false} />
                <ThresholdGrid label={t("audio.oeBc")} ear="left" conduction="bc" value={draft.left} onChange={setThreshold} readOnly={false} />
              </tbody>
            </table>
          </div>

          <input
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t("audio.notesPlaceholder")}
            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm"
          />

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
              onClick={save}
              disabled={saving}
              className="flex-1 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold disabled:opacity-50 inline-flex items-center justify-center gap-2"
            >
              {saving && <Loader2 size={14} className="animate-spin" />}
              {t("audio.save")}
            </button>
          </div>
        </div>
      )}

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center text-sm text-slate-400">
          {t("audio.empty")}
        </div>
      ) : (
        <>
          <div className="flex flex-wrap gap-2">
            {items.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setSelectedId(item.id)}
                className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                  selected?.id === item.id
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-white text-slate-600 border-slate-200"
                }`}
              >
                {new Date(item.testedAt).toLocaleDateString(locale)}
              </button>
            ))}
          </div>

          {selected && (
            <div className="bg-white rounded-2xl border border-slate-100 p-4 space-y-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-sm font-semibold text-slate-800">
                    {new Date(selected.testedAt).toLocaleDateString(locale, {
                      day: "2-digit", month: "long", year: "numeric",
                    })}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {rightPta != null && rightGrade && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${GRADE_CLASS[rightGrade]}`}>
                        OD PTA {rightPta} dB ? {t(`audio.grade.${rightGrade}`)}
                      </span>
                    )}
                    {leftPta != null && leftGrade && (
                      <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full border ${GRADE_CLASS[leftGrade]}`}>
                        OE PTA {leftPta} dB ? {t(`audio.grade.${leftGrade}`)}
                      </span>
                    )}
                  </div>
                </div>
                {!readOnly && (
                  <button
                    type="button"
                    onClick={() => remove(selected.id)}
                    className="p-2 text-slate-400 hover:text-rose-500 rounded-lg"
                    title={t("audio.delete")}
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>

              <AudiogramChart thresholds={selected.thresholds} />

              <div className="flex flex-wrap justify-center gap-4 text-[10px] text-slate-500">
                <span className="inline-flex items-center gap-1">
                  <span className="w-3 h-3 rounded-full border-2 border-rose-500" /> {t("audio.legend.od")}
                </span>
                <span className="inline-flex items-center gap-1">
                  <span className="text-blue-600 font-bold">?</span> {t("audio.legend.oe")}
                </span>
                <span>{t("audio.legend.db")}</span>
              </div>

              {selected.notes && (
                <p className="text-sm text-slate-600 border-t border-slate-100 pt-3">{selected.notes}</p>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}
