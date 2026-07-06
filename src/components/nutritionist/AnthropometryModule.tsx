"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Loader2, Plus, TrendingUp } from "lucide-react";
import type { NutritionChart } from "./NutritionChartWorkspace";

type Entry = {
  id: string;
  recordedAt: string;
  weightKg: number | null;
  heightCm: number | null;
  bmi: number | null;
  waistCm: number | null;
  hipCm: number | null;
  armCm: number | null;
  thighCm: number | null;
  bodyFatPercent: number | null;
  notes: string | null;
};

function MiniLineChart({
  points,
  label,
}: {
  points: { y: number; label: string }[];
  label: string;
}) {
  const height = 140;
  const width = 300;
  const pad = { t: 12, r: 12, b: 28, l: 36 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  if (points.length === 0) {
    return <p className="text-sm text-slate-400 text-center py-8">{label}</p>;
  }

  const ys = points.map((p) => p.y);
  const minY = Math.min(...ys);
  const maxY = Math.max(...ys);
  const yPad = maxY === minY ? Math.max(1, minY * 0.1) : (maxY - minY) * 0.1;
  const y0 = minY - yPad;
  const y1 = maxY + yPad;

  const coords = points.map((p, i) => {
    const x = pad.l + (points.length === 1 ? innerW / 2 : (i / (points.length - 1)) * innerW);
    const y = pad.t + innerH - ((p.y - y0) / (y1 - y0)) * innerH;
    return { x, y, label: p.label };
  });

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-sm" role="img" aria-label={label}>
      <polyline
        fill="none"
        stroke="#d97706"
        strokeWidth="2"
        points={coords.map((c) => `${c.x},${c.y}`).join(" ")}
      />
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r="4" fill="#d97706" />
          <text x={c.x} y={height - 6} textAnchor="middle" fontSize="9" fill="#94a3b8">
            {c.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function AnthropometryModule({ chart }: { chart: NutritionChart }) {
  const { t, lang } = useI18n();
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    weightKg: "",
    heightCm: "",
    waistCm: "",
    hipCm: "",
    armCm: "",
    thighCm: "",
    bodyFatPercent: "",
    notes: "",
    context: "ADULT",
  });

  async function load() {
    setLoading(true);
    try {
      const res = await fetch(`/api/nutritionist/charts/${chart.id}/anthropometry`);
      const data = await res.json();
      setEntries(data.entries || []);
    } catch {
      setEntries([]);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [chart.id]);

  function num(v: string) {
    const n = parseFloat(v);
    return Number.isFinite(n) ? n : undefined;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);
    try {
      const res = await fetch(`/api/nutritionist/charts/${chart.id}/anthropometry`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          weightKg: num(form.weightKg),
          heightCm: num(form.heightCm),
          waistCm: num(form.waistCm),
          hipCm: num(form.hipCm),
          armCm: num(form.armCm),
          thighCm: num(form.thighCm),
          bodyFatPercent: num(form.bodyFatPercent),
          notes: form.notes || undefined,
          context: form.context as "ADULT" | "PREGNANT" | "PEDIATRIC",
        }),
      });
      if (!res.ok) {
        const data = await res.json();
        setError(data.error?.message || t("nutri.error"));
        return;
      }
      setForm({
        weightKg: "",
        heightCm: "",
        waistCm: "",
        hipCm: "",
        armCm: "",
        thighCm: "",
        bodyFatPercent: "",
        notes: "",
        context: "ADULT",
      });
      await load();
    } catch {
      setError(t("nutri.error"));
    } finally {
      setSaving(false);
    }
  }

  const weightPoints = entries
    .filter((e) => e.weightKg != null)
    .map((e) => ({
      y: e.weightKg as number,
      label: new Date(e.recordedAt).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" }),
    }));

  const bmiPoints = entries
    .filter((e) => e.bmi != null)
    .map((e) => ({
      y: e.bmi as number,
      label: new Date(e.recordedAt).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" }),
    }));

  const field = (key: keyof typeof form, labelKey: string, step = "0.1") => (
    <label className="block space-y-1">
      <span className="text-xs font-medium text-slate-600">{t(labelKey)}</span>
      <input
        type="number"
        step={step}
        value={form[key]}
        onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
        className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
      />
    </label>
  );

  return (
    <div className="space-y-6">
      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-amber-500" size={24} />
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">{t("nutri.anthro.weightChart")}</h3>
              <MiniLineChart points={weightPoints} label={t("nutri.anthro.empty")} />
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="text-sm font-semibold text-slate-800 mb-2">{t("nutri.anthro.bmiChart")}</h3>
              <MiniLineChart points={bmiPoints} label={t("nutri.anthro.empty")} />
            </div>
          </div>

          <form onSubmit={handleSubmit} className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
            <h3 className="font-semibold text-slate-900 flex items-center gap-2">
              <Plus size={16} className="text-amber-600" />
              {t("nutri.anthro.addEntry")}
            </h3>
            <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
              <label className="block space-y-1 sm:col-span-2 lg:col-span-4">
                <span className="text-xs font-medium text-slate-600">{t("nutri.anthro.context")}</span>
                <select
                  value={form.context}
                  onChange={(e) => setForm((f) => ({ ...f, context: e.target.value }))}
                  className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                >
                  <option value="ADULT">{t("nutri.anthro.context.adult")}</option>
                  <option value="PREGNANT">{t("nutri.anthro.context.pregnant")}</option>
                  <option value="PEDIATRIC">{t("nutri.anthro.context.pediatric")}</option>
                </select>
              </label>
              {field("weightKg", "nutri.anthro.weight")}
              {field("heightCm", "nutri.anthro.height")}
              {field("waistCm", "nutri.anthro.waist")}
              {field("hipCm", "nutri.anthro.hip")}
              {field("armCm", "nutri.anthro.arm")}
              {field("thighCm", "nutri.anthro.thigh")}
              {field("bodyFatPercent", "nutri.anthro.bodyFat")}
            </div>
            <label className="block space-y-1">
              <span className="text-xs font-medium text-slate-600">{t("nutri.anthro.notes")}</span>
              <textarea
                value={form.notes}
                onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
              />
            </label>
            {error && <p className="text-sm text-red-600">{error}</p>}
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-amber-600 text-white px-4 py-2.5 text-sm font-medium hover:bg-amber-700 disabled:opacity-50"
            >
              {saving ? t("nutri.saving") : t("nutri.save")}
            </button>
          </form>

          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-100 flex items-center gap-2">
              <TrendingUp size={16} className="text-amber-600" />
              <h3 className="font-semibold text-slate-900">{t("nutri.anthro.history")}</h3>
            </div>
            {entries.length === 0 ? (
              <p className="text-sm text-slate-500 p-6 text-center">{t("nutri.anthro.empty")}</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="text-left px-4 py-2">{t("nutri.date")}</th>
                      <th className="text-right px-4 py-2">{t("nutri.anthro.weight")}</th>
                      <th className="text-right px-4 py-2">{t("nutri.anthro.bmi")}</th>
                      <th className="text-right px-4 py-2">{t("nutri.anthro.waist")}</th>
                      <th className="text-right px-4 py-2">%</th>
                    </tr>
                  </thead>
                  <tbody>
                    {[...entries].reverse().map((e) => (
                      <tr key={e.id} className="border-t border-slate-100">
                        <td className="px-4 py-2">
                          {new Date(e.recordedAt).toLocaleDateString(locale)}
                        </td>
                        <td className="text-right px-4 py-2">{e.weightKg ?? "—"}</td>
                        <td className="text-right px-4 py-2">{e.bmi ?? "—"}</td>
                        <td className="text-right px-4 py-2">{e.waistCm ?? "—"}</td>
                        <td className="text-right px-4 py-2">{e.bodyFatPercent ?? "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
