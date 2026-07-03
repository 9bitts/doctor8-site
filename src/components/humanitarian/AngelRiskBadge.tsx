"use client";

import type { AngelRiskSummary } from "@/lib/humanitarian/angel-risk-summary";
import { translate, type Lang } from "@/lib/i18n/translations";

const PRIORITY_DARK: Record<string, string> = {
  CRISIS: "bg-rose-500/20 text-rose-200 border-rose-500/40",
  URGENT: "bg-amber-500/20 text-amber-200 border-amber-500/40",
  ROUTINE: "bg-slate-500/20 text-slate-300 border-slate-500/40",
};

const PRIORITY_LIGHT: Record<string, string> = {
  CRISIS: "bg-rose-100 text-rose-800 border-rose-200",
  URGENT: "bg-amber-100 text-amber-800 border-amber-200",
  ROUTINE: "bg-slate-100 text-slate-700 border-slate-200",
};

function t(lang: Lang, key: string): string {
  return translate(lang, key);
}

export default function AngelRiskBadge({
  summary,
  lang = "pt",
  dark = false,
  compact = false,
}: {
  summary: AngelRiskSummary | null;
  lang?: Lang;
  dark?: boolean;
  compact?: boolean;
}) {
  if (!summary) return null;

  const priority = summary.priority || "ROUTINE";
  const styles = dark ? PRIORITY_DARK : PRIORITY_LIGHT;
  const badgeClass = styles[priority] || styles.ROUTINE;
  const flagSeparator = t(lang, "angel.portal.listSeparator");

  return (
    <div className={compact ? "space-y-1" : "space-y-2"}>
      <span
        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold border ${badgeClass}`}
      >
        {t(lang, `angel.priority.${priority}`)}
      </span>
      {summary.triageFlagLabels.length > 0 && (
        <p className={`text-xs ${dark ? "text-slate-400" : "text-slate-600"}`}>
          {summary.triageFlagLabels.join(` ${flagSeparator} `)}
        </p>
      )}
    </div>
  );
}
