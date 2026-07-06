"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Loader2, ExternalLink } from "lucide-react";
import type { AdherenceReport } from "@/lib/nutrition/adherence";

export default function NutritionPatientChartPanel({ chartId }: { chartId: string }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const base = pathname.startsWith("/nutricionista") ? "/nutricionista" : "/professional";
  const [loading, setLoading] = useState(true);
  const [adherence, setAdherence] = useState<AdherenceReport | null>(null);
  const [planTitle, setPlanTitle] = useState<string | null>(null);
  const [lastWeight, setLastWeight] = useState<number | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const [adhRes, anthroRes] = await Promise.all([
          fetch(`/api/nutritionist/charts/${chartId}/adherence`),
          fetch(`/api/nutritionist/charts/${chartId}/anthropometry`),
        ]);
        const adh = await adhRes.json();
        const anthro = await anthroRes.json();
        setAdherence(adh.report ?? null);
        setPlanTitle(adh.activePlan?.title ?? null);
        const entries = anthro.entries || [];
        const last = entries[entries.length - 1];
        setLastWeight(last?.weightKg ?? null);
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [chartId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-amber-500" size={22} />
      </div>
    );
  }

  const links = [
    { href: `${base}/anamnese`, label: t("nutri.mod.anamnese.title") },
    { href: `${base}/antropometria`, label: t("nutri.mod.anthropometry.title") },
    { href: `${base}/planos`, label: t("nutri.mod.mealPlans.title") },
    { href: `${base}/diario`, label: t("nutri.mod.foodDiary.title") },
  ];

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50/40 p-5 space-y-4">
      <h3 className="font-semibold text-slate-900">{t("nutri.chart.panelTitle")}</h3>
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl bg-white border border-slate-100 p-3">
          <p className="text-slate-500 text-xs">{t("nutri.adherence.score")}</p>
          <p className="text-2xl font-bold text-amber-700">{adherence?.score ?? 0}%</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-100 p-3">
          <p className="text-slate-500 text-xs">{t("nutri.anthro.weight")}</p>
          <p className="text-2xl font-bold text-slate-800">{lastWeight != null ? `${lastWeight} kg` : "—"}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-100 p-3">
          <p className="text-slate-500 text-xs">{t("nutri.meal.plans")}</p>
          <p className="text-sm font-medium text-slate-800 truncate">{planTitle ?? "—"}</p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={`${l.href}?patientRecordId=${chartId}`}
              className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-medium text-amber-800 hover:bg-amber-50"
            >
              {l.label}
              <ExternalLink size={12} />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
