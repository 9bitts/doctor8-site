"use client";

import { useState, useEffect } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { METRIC_FIELDS, type ClinicalMetricsSnapshot } from "@/lib/clinical-metrics";
import { Loader2, TrendingUp, Plus } from "lucide-react";

type MetricKey = (typeof METRIC_FIELDS)[number]["key"];

function SimpleLineChart({
  points,
  height = 160,
}: {
  points: { x: number; y: number; label: string }[];
  height?: number;
}) {
  const width = 320;
  const pad = { t: 12, r: 12, b: 28, l: 36 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  if (points.length === 0) {
    return (
      <div className="flex items-center justify-center text-sm text-slate-400" style={{ height }}>
        ?
      </div>
    );
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
    return { x, y, label: p.label, value: p.y };
  });

  const line = coords.map((c) => `${c.x},${c.y}`).join(" ");

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full max-w-md" role="img">
      <line x1={pad.l} y1={pad.t + innerH} x2={width - pad.r} y2={pad.t + innerH} stroke="#e2e8f0" />
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + innerH} stroke="#e2e8f0" />
      {coords.length > 1 && (
        <polyline fill="none" stroke="#0d9488" strokeWidth="2" points={line} />
      )}
      {coords.map((c, i) => (
        <g key={i}>
          <circle cx={c.x} cy={c.y} r="4" fill="#0d9488" />
          <text x={c.x} y={height - 6} textAnchor="middle" fontSize="9" fill="#94a3b8">
            {c.label}
          </text>
        </g>
      ))}
    </svg>
  );
}

export default function MetricsEvolutionPanel({
  chartId,
  onAddVitals,
  readOnly,
}: {
  chartId: string;
  onAddVitals?: () => void;
  readOnly?: boolean;
}) {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<ClinicalMetricsSnapshot[]>([]);
  const [metricKey, setMetricKey] = useState<MetricKey>("weightKg");

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await fetch(`/api/professional/records/${chartId}/metrics`);
        const data = await res.json();
        if (active) setSnapshots(data.snapshots || []);
      } catch { /* ignore */ }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [chartId]);

  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const availableMetrics = METRIC_FIELDS.filter((f) =>
    snapshots.some((s) => s[f.key] != null),
  );

  const activeKey = availableMetrics.some((f) => f.key === metricKey)
    ? metricKey
    : (availableMetrics[0]?.key ?? "weightKg");

  const chartPoints = snapshots
    .filter((s) => s[activeKey] != null)
    .map((s) => ({
      y: s[activeKey] as number,
      label: new Date(s.recordedAt).toLocaleDateString(locale, { day: "2-digit", month: "2-digit" }),
      x: new Date(s.recordedAt).getTime(),
    }));

  const fieldMeta = METRIC_FIELDS.find((f) => f.key === activeKey);

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-brand-500" size={24} />
      </div>
    );
  }

  if (snapshots.length === 0) {
    return (
      <div className="bg-white rounded-2xl border border-slate-100 p-8 text-center">
        <TrendingUp className="mx-auto text-slate-300 mb-2" size={32} />
        <p className="text-sm text-slate-500">{t("metric.empty")}</p>
        {!readOnly && onAddVitals && (
          <button
            type="button"
            onClick={onAddVitals}
            className="mt-4 inline-flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold px-4 py-2.5 rounded-xl text-sm transition"
          >
            <Plus size={16} /> {t("metric.addVitalsCta")}
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {availableMetrics.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {availableMetrics.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setMetricKey(f.key)}
              className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
                activeKey === f.key
                  ? "bg-brand-500 text-white border-brand-500"
                  : "bg-white text-slate-600 border-slate-200 hover:border-brand-200"
              }`}
            >
              {t(f.labelKey)}
            </button>
          ))}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <p className="text-xs font-medium text-slate-500 mb-2">
          {fieldMeta ? t(fieldMeta.labelKey) : ""}
          {fieldMeta?.unit ? ` (${fieldMeta.unit})` : ""}
        </p>
        <SimpleLineChart points={chartPoints} />
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">{t("metric.colDate")}</th>
                <th className="px-4 py-2 font-medium">{t("metric.weight")}</th>
                <th className="px-4 py-2 font-medium">{t("metric.bmi")}</th>
                <th className="px-4 py-2 font-medium">PA</th>
                <th className="px-4 py-2 font-medium">{t("metric.glucose")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...snapshots].reverse().map((s) => (
                <tr key={s.id}>
                  <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                    {new Date(s.recordedAt).toLocaleString(locale, {
                      day: "2-digit", month: "2-digit", year: "2-digit",
                      hour: "2-digit", minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2">{s.weightKg ?? "?"}</td>
                  <td className="px-4 py-2">{s.bmi ?? "?"}</td>
                  <td className="px-4 py-2">
                    {s.systolicBp != null && s.diastolicBp != null
                      ? `${s.systolicBp}/${s.diastolicBp}`
                      : "?"}
                  </td>
                  <td className="px-4 py-2">{s.glucoseMgDl ?? "?"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
