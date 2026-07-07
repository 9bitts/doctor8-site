"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { pharmacistPortalBase } from "@/lib/pharmacist-portal";
import { Loader2, ExternalLink } from "lucide-react";

export default function PharmacistPatientChartPanel({ chartId }: { chartId: string }) {
  const { t } = useI18n();
  const pathname = usePathname();
  const base = pharmacistPortalBase(pathname);
  const [loading, setLoading] = useState(true);
  const [lastReviewAt, setLastReviewAt] = useState<string | null>(null);
  const [pendingIntake, setPendingIntake] = useState(0);
  const [openInteractions, setOpenInteractions] = useState(0);

  useEffect(() => {
    (async () => {
      try {
        const [reviewRes, intakeRes, interactionRes] = await Promise.all([
          fetch(`/api/pharmacist/charts/${chartId}/med-reviews`),
          fetch(`/api/pharmacist/charts/${chartId}/intake-forms`),
          fetch(`/api/pharmacist/charts/${chartId}/interactions`),
        ]);
        const reviews = await reviewRes.json();
        const intake = await intakeRes.json();
        const interactions = await interactionRes.json();
        const latest = (reviews.reviews || [])[0];
        setLastReviewAt(latest?.reviewedAt ?? null);
        setPendingIntake((intake.forms || []).filter((f: { status: string }) => f.status === "PENDING").length);
        setOpenInteractions(
          (interactions.checks || []).filter(
            (c: { maxSeverity: string }) =>
              c.maxSeverity === "MAJOR" || c.maxSeverity === "CONTRAINDICATED",
          ).length,
        );
      } catch {
        /* ignore */
      }
      setLoading(false);
    })();
  }, [chartId]);

  if (loading) {
    return (
      <div className="flex justify-center py-8">
        <Loader2 className="animate-spin text-teal-500" size={22} />
      </div>
    );
  }

  const links = [
    { href: `${base}/revisao`, label: t("pharma.mod.medReview.title") },
    { href: `${base}/intake`, label: t("pharma.mod.intake.title") },
    { href: `${base}/reconciliacao`, label: t("pharma.mod.reconciliation.title") },
    { href: `${base}/monitoramento`, label: t("pharma.mod.monitoring.title") },
    { href: `${base}/prescricao`, label: t("pharma.mod.pharmaRx.title") },
    { href: `${base}/educacao`, label: t("pharma.mod.education.title") },
    { href: `${base}/dispensacao`, label: t("pharma.mod.dispensing.title") },
    { href: `${base}/interacoes`, label: t("pharma.mod.interactions.title") },
  ];

  return (
    <div className="rounded-2xl border border-teal-200 bg-teal-50/40 p-5 space-y-4">
      <h3 className="font-semibold text-slate-900">{t("pharma.chart.panelTitle")}</h3>
      <div className="grid sm:grid-cols-3 gap-3 text-sm">
        <div className="rounded-xl bg-white border border-slate-100 p-3">
          <p className="text-slate-500 text-xs">{t("pharma.chart.lastReview")}</p>
          <p className="text-lg font-bold text-teal-700">
            {lastReviewAt ? new Date(lastReviewAt).toLocaleDateString() : "—"}
          </p>
        </div>
        <div className="rounded-xl bg-white border border-slate-100 p-3">
          <p className="text-slate-500 text-xs">{t("pharma.intake.pending")}</p>
          <p className="text-2xl font-bold text-slate-800">{pendingIntake}</p>
        </div>
        <div className="rounded-xl bg-white border border-slate-100 p-3">
          <p className="text-slate-500 text-xs">{t("pharma.chart.criticalInteractions")}</p>
          <p className="text-2xl font-bold text-slate-800">{openInteractions}</p>
        </div>
      </div>
      <ul className="flex flex-wrap gap-2">
        {links.map((l) => (
          <li key={l.href}>
            <Link
              href={`${l.href}?patientRecordId=${chartId}`}
              className="inline-flex items-center gap-1 rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-xs font-medium text-teal-800 hover:bg-teal-50"
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
