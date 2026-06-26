"use client";

import { Pin } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  TIMELINE_FILTERS,
  type RecordTimelineFilter,
  timelineFilterLabelKey,
  kindBadgeClass,
  recordKindLabelKey,
  type ClinicalRecordKind,
} from "@/lib/record-kind";

export function RecordTimelineFilters({
  value,
  onChange,
  counts,
}: {
  value: RecordTimelineFilter;
  onChange: (f: RecordTimelineFilter) => void;
  counts: Partial<Record<RecordTimelineFilter, number>>;
}) {
  const { t } = useI18n();

  return (
    <div className="flex gap-2 overflow-x-auto pb-1">
      {TIMELINE_FILTERS.map((f) => {
        const n = counts[f];
        return (
          <button
            key={f}
            type="button"
            onClick={() => onChange(f)}
            className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
              value === f
                ? "bg-brand-500 text-white border-brand-500"
                : "bg-white text-slate-600 border-slate-200 hover:border-brand-200"
            }`}
          >
            {t(timelineFilterLabelKey(f))}
            {n != null && n > 0 ? ` (${n})` : ""}
          </button>
        );
      })}
    </div>
  );
}

export function PinnedAnamnesisCard({
  title,
  preview,
  dateLabel,
  onView,
}: {
  title: string;
  preview: string;
  dateLabel: string;
  onView: () => void;
}) {
  const { t } = useI18n();

  return (
    <div className="bg-violet-50 border border-violet-200 rounded-2xl p-4">
      <div className="flex items-start gap-2">
        <Pin size={16} className="text-violet-600 shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <p className="text-xs font-bold text-violet-700 uppercase tracking-wide">
            {t("timeline.pinnedAnamnesis")}
          </p>
          <p className="font-semibold text-sm text-slate-800 mt-1 truncate">{title}</p>
          <p className="text-xs text-slate-500 mt-0.5">{dateLabel}</p>
          {preview && (
            <p className="text-sm text-slate-600 mt-2 line-clamp-2 whitespace-pre-wrap">{preview}</p>
          )}
          <button
            type="button"
            onClick={onView}
            className="text-xs font-semibold text-violet-700 hover:text-violet-900 mt-2"
          >
            {t("timeline.viewPinned")} ?
          </button>
        </div>
      </div>
    </div>
  );
}

export function RecordKindBadge({ kind }: { kind: ClinicalRecordKind | string }) {
  const { t } = useI18n();
  const k = kind as ClinicalRecordKind;
  return (
    <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border ${kindBadgeClass(k)}`}>
      {t(recordKindLabelKey(k))}
    </span>
  );
}

export function RecordTimelineDot() {
  return (
    <div className="absolute left-[11px] top-5 w-2.5 h-2.5 rounded-full bg-brand-400 border-2 border-white shadow-sm z-10" />
  );
}
