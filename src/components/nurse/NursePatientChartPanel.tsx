"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Loader2, ExternalLink } from "lucide-react";

export default function NursePatientChartPanel({ chartId }: { chartId: string }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const base = pathname.startsWith("/enfermeiro") ? "/enfermeiro" : "/professional";
  const [loading, setLoading] = useState(true);
  const [lastBraden, setLastBraden] = useState<number | null>(null);
  const [activePlans, setActivePlans] = useState(0);
  const [pendingIntake, setPendingIntake] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [scalesRes, plansRes, intakeRes] = await Promise.all([
          fetch(`/api/nurse/charts/${chartId}/scales`),
          fetch(`/api/nurse/charts/${chartId}/care-plans`),
          fetch(`/api/nurse/charts/${chartId}/intake-forms`),
        ]);
        const scales = await scalesRes.json();
        const plans = await plansRes.json();
        const intake = await intakeRes.json();
        const braden = (scales.entries || []).find((e: { scaleType: string }) => e.scaleType === "BRADEN");
        setLastBraden(braden?.score ?? null);
        setActivePlans((plans.plans || []).filter((p: { isActive: boolean }) => p.isActive).length);
        setPendingIntake((intake.forms || []).filter((f: { status: string }) => f.status === "PENDING").length);
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [chartId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-rose-500" size={22} />
      </div>
    );
  }

  const links = [
    { href: `${base}/sae`, label: t("nurse.mod.sae.title") },
    { href: `${base}/escalas`, label: t("nurse.mod.scales.title") },
    { href: `${base}/prescricao`, label: t("nurse.mod.carePlan.title") },
    { href: `${base}/monitoramento`, label: t("nurse.mod.monitoring.title") },
  ];

  return (
    <div className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 space-y-4">
      <h3 className="font-semibold text-slate-900">{t("nurse.chart.panelTitle")}</h3>
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl bg-white border border-slate-100 p-3">
          <p className="text-slate-500 text-xs">{t("nurse.scale.braden")}</p>
          <p className="text-2xl font-bold text-rose-700">{lastBraden ?? "—"}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-100 p-3">
          <p className="text-slate-500 text-xs">{t("nurse.carePlan.active")}</p>
          <p className="text-2xl font-bold text-slate-800">{activePlans}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-100 p-3">
          <p className="text-slate-500 text-xs">{t("nurse.intake.pending")}</p>
          <p className="text-2xl font-bold text-slate-800">{pendingIntake}</p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={`${l.href}?patientRecordId=${chartId}`}
              className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-medium text-rose-800 hover:bg-rose-50"
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
