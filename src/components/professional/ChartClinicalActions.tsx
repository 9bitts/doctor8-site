"use client";

import Link from "next/link";
import { Pill, FlaskConical, ScrollText, FileCheck } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";
import { chartActionUrl } from "@/lib/video-chart-nav";

export default function ChartClinicalActions({
  chartId,
  returnUrl,
  compact = false,
}: {
  chartId: string;
  returnUrl: string;
  compact?: boolean;
}) {
  const t = useT();
  const btnClass = compact
    ? "inline-flex items-center gap-1 text-[11px] font-semibold text-brand-600 hover:text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-100 px-2 py-1 rounded-lg transition"
    : "inline-flex items-center gap-1.5 text-xs font-medium text-brand-700 bg-brand-50 hover:bg-brand-100 border border-brand-200 px-3 py-1.5 rounded-lg transition";

  const items = [
    {
      href: chartActionUrl("/professional/prescriptions", chartId, { view: "prescription", returnUrl }),
      icon: Pill,
      label: t("chartAct.prescribe"),
    },
    {
      href: chartActionUrl("/professional/prescriptions", chartId, { view: "exam", returnUrl }),
      icon: FlaskConical,
      label: t("chartAct.exam"),
    },
    {
      href: (() => {
        const sp = new URLSearchParams({ newRecord: "1", docType: "EXAM_RESULT" });
        if (returnUrl) sp.set("returnUrl", returnUrl);
        return `/professional/patients/${chartId}?${sp.toString()}`;
      })(),
      icon: FileCheck,
      label: t("chartAct.examResult"),
    },
    {
      href: chartActionUrl("/professional/prescriptions", chartId, { view: "document", returnUrl }),
      icon: ScrollText,
      label: t("chartAct.document"),
    },
  ];

  return (
    <div className={`flex gap-2 flex-wrap ${compact ? "mt-2" : "mt-3"}`}>
      {items.map(({ href, icon: Icon, label }) => (
        <Link key={href} href={href} className={btnClass}>
          <Icon size={compact ? 11 : 13} /> {label}
        </Link>
      ))}
    </div>
  );
}
