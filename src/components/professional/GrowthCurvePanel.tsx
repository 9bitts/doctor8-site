"use client";

import { useState, useEffect, useMemo } from "react";
import { Loader2, LineChart, AlertCircle } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { ClinicalMetricsSnapshot } from "@/lib/clinical-metrics";
import {
  GROWTH_CHART_META,
  PERCENTILE_LINES,
  ageInMonths,
  buildPercentileCurve,
  evaluateMeasurement,
  normalizeGrowthSex,
  type GrowthChartType,
} from "@/lib/who-growth";

function WhoGrowthChart({
  chartType,
  sex,
  points,
  maxAgeMonths,
  unit,
}: {
  chartType: GrowthChartType;
  sex: ReturnType<typeof normalizeGrowthSex>;
  points: { ageMonths: number; value: number; label: string }[];
  maxAgeMonths: number;
  unit: string;
}) {
  const width = 480;
  const height = 220;
  const pad = { t: 16, r: 16, b: 32, l: 44 };
  const innerW = width - pad.l - pad.r;
  const innerH = height - pad.t - pad.b;

  const percentileCurves = PERCENTILE_LINES.map((p) => ({
    ...p,
    curve: buildPercentileCurve(sex, chartType, p.z, maxAgeMonths, 2),
  }));

  const allY = [
    ...points.map((p) => p.value),
    ...percentileCurves.flatMap((c) => c.curve.map((pt) => pt.value)),
  ];
  const minY = Math.min(...allY);
  const maxY = Math.max(...allY);
  const yPad = (maxY - minY) * 0.08 || 1;
  const y0 = minY - yPad;
  const y1 = maxY + yPad;

  const xMax = Math.max(maxAgeMonths, ...points.map((p) => p.ageMonths), 12);

  const toX = (age: number) => pad.l + (age / xMax) * innerW;
  const toY = (val: number) => pad.t + innerH - ((val - y0) / (y1 - y0)) * innerH;

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className="w-full" role="img">
      <line x1={pad.l} y1={pad.t + innerH} x2={width - pad.r} y2={pad.t + innerH} stroke="#e2e8f0" />
      <line x1={pad.l} y1={pad.t} x2={pad.l} y2={pad.t + innerH} stroke="#e2e8f0" />

      {percentileCurves.map((curve) => (
        <g key={curve.label}>
          <polyline
            fill="none"
            stroke={curve.label === "P50" ? "#94a3b8" : "#e2e8f0"}
            strokeWidth={curve.label === "P50" ? 1.5 : 1}
            strokeDasharray={curve.label === "P50" ? undefined : "4 3"}
            points={curve.curve.map((pt) => `${toX(pt.ageMonths)},${toY(pt.value)}`).join(" ")}
          />
          <text
            x={width - pad.r - 2}
            y={toY(curve.curve[curve.curve.length - 1].value)}
            textAnchor="end"
            fontSize="8"
            fill="#94a3b8"
          >
            {curve.label}
          </text>
        </g>
      ))}

      {points.length > 1 && (
        <polyline
          fill="none"
          stroke="#0d9488"
          strokeWidth="2"
          points={points.map((p) => `${toX(p.ageMonths)},${toY(p.value)}`).join(" ")}
        />
      )}
      {points.map((p, i) => (
        <g key={i}>
          <circle cx={toX(p.ageMonths)} cy={toY(p.value)} r="4" fill="#0d9488" />
          <title>{`${p.label}: ${p.value} ${unit} (${p.ageMonths}m)`}</title>
        </g>
      ))}

      {[0, Math.round(xMax / 4), Math.round(xMax / 2), Math.round((3 * xMax) / 4), xMax].map((age) => (
        <text key={age} x={toX(age)} y={height - 8} textAnchor="middle" fontSize="9" fill="#94a3b8">
          {age}m
        </text>
      ))}
      <text
        x={pad.l - 8}
        y={pad.t + 8}
        textAnchor="end"
        fontSize="9"
        fill="#94a3b8"
        transform={`rotate(-90 ${pad.l - 8} ${pad.t + 8})`}
      >
        {unit}
      </text>
    </svg>
  );
}

export default function GrowthCurvePanel({
  chartId,
  dateOfBirth,
  sex,
}: {
  chartId: string;
  dateOfBirth?: string;
  sex?: string;
}) {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [snapshots, setSnapshots] = useState<ClinicalMetricsSnapshot[]>([]);
  const [chartType, setChartType] = useState<GrowthChartType>("wfa");

  const growthSex = normalizeGrowthSex(sex);
  const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es-ES" : "en-US";
  const meta = GROWTH_CHART_META[chartType];

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

  const rows = useMemo(() => {
    if (!dateOfBirth) return [];
    const key = meta.valueKey;
    return snapshots
      .filter((s) => s[key] != null)
      .map((s) => {
        const at = new Date(s.recordedAt);
        const age = ageInMonths(dateOfBirth, at);
        const value = s[key] as number;
        const eval_ = age <= meta.maxAgeMonths
          ? evaluateMeasurement(growthSex, chartType, age, value)
          : { zScore: NaN, percentile: NaN };
        return {
          id: s.id,
          recordedAt: s.recordedAt,
          ageMonths: age,
          value,
          percentile: eval_.percentile,
          zScore: eval_.zScore,
        };
      })
      .filter((r) => r.ageMonths <= meta.maxAgeMonths + 1);
  }, [snapshots, dateOfBirth, chartType, growthSex, meta]);

  const chartPoints = rows.map((r) => ({
    ageMonths: r.ageMonths,
    value: r.value,
    label: new Date(r.recordedAt).toLocaleDateString(locale, { day: "2-digit", month: "2-digit", year: "2-digit" }),
  }));

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="animate-spin text-brand-500" size={24} />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {!dateOfBirth && (
        <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertCircle size={16} className="shrink-0 mt-0.5" />
          {t("growth.noDobHint")}
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {(Object.keys(GROWTH_CHART_META) as GrowthChartType[]).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setChartType(key)}
            className={`text-xs font-medium px-3 py-1.5 rounded-full border transition ${
              chartType === key
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-white text-slate-600 border-slate-200 hover:border-brand-200"
            }`}
          >
            {t(GROWTH_CHART_META[key].labelKey)}
          </button>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 p-4">
        <div className="flex items-center justify-between gap-2 mb-2">
          <p className="text-sm font-semibold text-slate-800 flex items-center gap-2">
            <LineChart size={16} className="text-brand-500" />
            {t(meta.labelKey)}
          </p>
          <span className="text-[10px] text-slate-400 uppercase">{t("growth.whoRef")}</span>
        </div>
        {dateOfBirth && chartPoints.length > 0 ? (
          <WhoGrowthChart
            chartType={chartType}
            sex={growthSex}
            points={chartPoints}
            maxAgeMonths={meta.maxAgeMonths}
            unit={meta.unit}
          />
        ) : (
          <div className="text-center py-10 text-sm text-slate-400">
            {t("growth.noData")}
          </div>
        )}
        <p className="text-[10px] text-slate-400 mt-2">
          {t("growth.sexRef").replace("{sex}", growthSex === "F" ? t("growth.sex.female") : t("growth.sex.male"))}
        </p>
      </div>

      {rows.length > 0 && (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs text-slate-500">
                <th className="px-4 py-2 font-medium">{t("metric.colDate")}</th>
                <th className="px-4 py-2 font-medium">{t("growth.col.age")}</th>
                <th className="px-4 py-2 font-medium">{t("growth.col.value")}</th>
                <th className="px-4 py-2 font-medium">{t("growth.col.percentile")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {[...rows].reverse().map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-2 text-slate-600 whitespace-nowrap">
                    {new Date(r.recordedAt).toLocaleDateString(locale)}
                  </td>
                  <td className="px-4 py-2">{r.ageMonths.toFixed(1)} {t("growth.months")}</td>
                  <td className="px-4 py-2 font-medium">{r.value} {meta.unit}</td>
                  <td className="px-4 py-2">
                    {Number.isFinite(r.percentile) ? (
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                        r.percentile < 3 || r.percentile > 97
                          ? "bg-rose-50 text-rose-700"
                          : r.percentile < 15 || r.percentile > 85
                            ? "bg-amber-50 text-amber-800"
                            : "bg-emerald-50 text-emerald-700"
                      }`}>
                        P{r.percentile}
                      </span>
                    ) : "?"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
