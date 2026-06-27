"use client";

import { AlertTriangle, FileText } from "lucide-react";
import type { IntakeSummarySection } from "@/lib/humanitarian/intake-summary";

type Summary = {
  priority: string | null;
  status: string;
  anamneseComplete: boolean;
  sections: IntakeSummarySection[];
};

const PRIORITY_STYLE: Record<string, string> = {
  CRISIS: "bg-rose-100 text-rose-800 border-rose-200",
  URGENT: "bg-amber-100 text-amber-800 border-amber-200",
  ROUTINE: "bg-slate-100 text-slate-700 border-slate-200",
};

export default function HumanitarianIntakeSummary({
  summary,
  chiefComplaint,
  compact = false,
  dark = false,
}: {
  summary: Summary | null;
  chiefComplaint?: string | null;
  compact?: boolean;
  dark?: boolean;
}) {
  if (!summary && !chiefComplaint) {
    return (
      <p className={`text-xs ${dark ? "text-slate-500" : "text-slate-400"}`}>
        Sin ficha de triaje/anamnesis a?n.
      </p>
    );
  }

  const pri = summary?.priority || "ROUTINE";
  const card = dark ? "bg-white/5 border-white/10" : "bg-white border-slate-100";
  const text = dark ? "text-slate-300" : "text-slate-600";
  const title = dark ? "text-white" : "text-slate-900";

  return (
    <div className={`space-y-3 ${compact ? "text-xs" : "text-sm"}`}>
      {summary && (
        <div className="flex flex-wrap items-center gap-2">
          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold border ${PRIORITY_STYLE[pri] || PRIORITY_STYLE.ROUTINE}`}>
            {(pri === "CRISIS" || pri === "URGENT") && <AlertTriangle size={12} />}
            {pri}
          </span>
          <span className={`text-xs ${dark ? "text-slate-500" : "text-slate-400"}`}>
            {summary.anamneseComplete ? "Ficha completa" : summary.status === "PARTIAL" ? "Ficha parcial" : "S? triagem"}
          </span>
        </div>
      )}

      {chiefComplaint && (
        <div className={`rounded-xl p-3 border ${card}`}>
          <p className={`text-xs font-medium mb-1 ${dark ? "text-slate-400" : "text-slate-500"}`}>Queixa</p>
          <p className={title}>{chiefComplaint}</p>
        </div>
      )}

      {summary?.sections.map((section) => (
        <div key={section.title} className={`rounded-xl p-3 border ${card}`}>
          <p className={`font-semibold mb-2 flex items-center gap-1.5 ${title}`}>
            <FileText size={13} className="text-emerald-500 shrink-0" />
            {section.title}
          </p>
          <dl className="space-y-1">
            {section.items.map((item, i) => (
              <div key={`${section.title}-${i}`} className="grid grid-cols-[minmax(0,38%)_1fr] gap-x-2 gap-y-0.5">
                {item.label ? (
                  <dt className={`${text} truncate`}>{item.label}</dt>
                ) : (
                  <dt className="sr-only">Nota</dt>
                )}
                <dd className={`${title} break-words`}>{item.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      ))}
    </div>
  );
}
