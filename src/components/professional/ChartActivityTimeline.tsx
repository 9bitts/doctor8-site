"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronUp, Clock, Copy, ExternalLink, Eye } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import {
  type ChartActivityEvent,
  type ActivityTimelineFilter,
  ACTIVITY_CATEGORY_COLORS,
  ACTIVITY_CATEGORY_DOT,
  ACTIVITY_MODULE_PATHS,
  countActivityByCategory,
  filterActivityEvents,
} from "@/lib/chart-activity-timeline";
import { chartActionUrl } from "@/lib/video-chart-nav";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import { buildEmissionReuseUrl } from "@/lib/emission-reuse-nav";
import { openAuthenticatedPdf } from "@/lib/open-url-safely";

const CONTENT_PREVIEW_CHARS = 200;

const FILTER_OPTIONS: ActivityTimelineFilter[] = [
  "all",
  "record",
  "dental",
  "nutrition",
  "nursing",
  "pharmacy",
  "diagnosis",
  "vaccine",
  "vitals",
  "audio",
];

function activityFilterLabelKey(filter: ActivityTimelineFilter): string {
  return `activityTimeline.filter.${filter}`;
}

function activityCategoryLabelKey(category: ChartActivityEvent["category"]): string {
  return `activityTimeline.category.${category}`;
}

function resolveApiBase(pathname: string): string {
  if (pathname.startsWith("/integrative-therapist")) return "/api/integrative-therapist";
  return "/api/professional";
}

function resolveModuleHref(
  pathname: string,
  chartId: string,
  moduleKey: ChartActivityEvent["moduleKey"],
  sourceId: string | null,
): string | null {
  const basePath = ACTIVITY_MODULE_PATHS[moduleKey];
  if (!basePath) return null;

  const portalPath = mapProfessionalPathToPortal(pathname, basePath);

  if (moduleKey === "record" || moduleKey === "diagnosis" || moduleKey === "vaccine" || moduleKey === "vitals" || moduleKey === "audio") {
    const tab =
      moduleKey === "diagnosis" ? "diagnoses"
      : moduleKey === "vaccine" ? "vaccines"
      : moduleKey === "vitals" ? "evolution"
      : moduleKey === "audio" ? "audio"
      : "records";
    const params = new URLSearchParams({ tab });
    if (sourceId && moduleKey === "record") params.set("recordId", sourceId);
    return `${pathname}?${params.toString()}`;
  }

  return chartActionUrl(portalPath, chartId);
}

export default function ChartActivityTimeline({
  chartId,
  events,
  pathname,
}: {
  chartId: string;
  events: ChartActivityEvent[];
  pathname: string;
}) {
  const { t, lang } = useI18n();
  const localeFull = localeOf(lang);
  const [filter, setFilter] = useState<ActivityTimelineFilter>("all");
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [pdfError, setPdfError] = useState<string | null>(null);

  const apiBase = resolveApiBase(pathname);
  const prescriptionsPath = mapProfessionalPathToPortal(pathname, "/professional/prescriptions");

  async function viewPrescription(ev: ChartActivityEvent) {
    setPdfError(null);
    const pdfUrl = ev.emissionId
      ? `${apiBase}/prescriptions/${ev.emissionId}/pdf?lang=${lang}`
      : ev.sourceId
        ? `${apiBase}/documents/${ev.sourceId}/pdf?lang=${lang}`
        : null;
    if (!pdfUrl) return;
    try {
      await openAuthenticatedPdf(pdfUrl);
    } catch {
      setPdfError(t("rx.signedPdfUnavailable"));
    }
  }

  function reusePrescription(ev: ChartActivityEvent) {
    if (!ev.emissionId) return;
    window.location.href = buildEmissionReuseUrl(
      prescriptionsPath,
      chartId,
      "prescription",
      ev.emissionId,
    );
  }

  const counts = useMemo(() => countActivityByCategory(events), [events]);
  const filtered = useMemo(() => filterActivityEvents(events, filter), [events, filter]);

  const visibleFilters = FILTER_OPTIONS.filter(
    (f) => f === "all" || (counts[f] ?? 0) > 0,
  );

  function toggleExpanded(id: string) {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  if (events.length === 0) {
    return (
      <div className="text-center py-14 bg-white rounded-2xl border border-slate-100">
        <Clock className="mx-auto text-slate-300 mb-3" size={36} />
        <p className="text-slate-400 text-sm">{t("activityTimeline.empty")}</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-bold text-slate-900">{t("activityTimeline.title")}</h2>
        <p className="text-sm text-slate-500 mt-0.5">{t("activityTimeline.desc")}</p>
      </div>

      {visibleFilters.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {visibleFilters.map((f) => {
            const n = counts[f];
            return (
              <button
                key={f}
                type="button"
                onClick={() => setFilter(f)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-full text-xs font-semibold transition border ${
                  filter === f
                    ? "bg-brand-500 text-white border-brand-500"
                    : "bg-white text-slate-600 border-slate-200 hover:border-brand-200"
                }`}
              >
                {t(activityFilterLabelKey(f))}
                {n != null && n > 0 ? ` (${n})` : ""}
              </button>
            );
          })}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {filtered.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-slate-400 text-sm">{t("activityTimeline.emptyFilter")}</p>
          </div>
        ) : (
          <div className="relative pl-8 pr-2 py-2">
            <div className="absolute left-[15px] top-4 bottom-4 w-px bg-slate-200" aria-hidden />
            {filtered.map((ev) => {
              const isExpanded = expandedIds.has(ev.id);
              const displayText = ev.detail ?? ev.summary ?? "";
              const canExpand = displayText.length > CONTENT_PREVIEW_CHARS;
              const previewText = !isExpanded && displayText.length > CONTENT_PREVIEW_CHARS
                ? `${displayText.slice(0, CONTENT_PREVIEW_CHARS).trim()}…`
                : displayText;
              const moduleHref = resolveModuleHref(pathname, chartId, ev.moduleKey, ev.sourceId);
              const badgeClass = ACTIVITY_CATEGORY_COLORS[ev.category];
              const dotClass = ACTIVITY_CATEGORY_DOT[ev.category];

              return (
                <div
                  key={ev.id}
                  className="relative px-3 py-4 border-b border-slate-50 last:border-0"
                >
                  <div
                    className={`absolute left-[11px] top-5 w-2.5 h-2.5 rounded-full border-2 border-white shadow-sm z-10 ${dotClass}`}
                  />
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeClass}`}>
                      {t(activityCategoryLabelKey(ev.category))}
                    </span>
                  </div>
                  <p className="font-semibold text-slate-800 text-sm">{ev.title}</p>
                  {ev.summary && ev.summary !== ev.detail && (
                    <p className="text-sm text-slate-600 mt-0.5">{ev.summary}</p>
                  )}
                  <p className="text-xs text-slate-400 mt-0.5">
                    {new Date(ev.at).toLocaleString(localeFull, {
                      day: "2-digit",
                      month: "2-digit",
                      year: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  {displayText && (
                    <p className={`text-sm text-slate-600 mt-1 whitespace-pre-wrap ${!isExpanded && canExpand ? "line-clamp-3" : ""}`}>
                      {isExpanded || !canExpand ? displayText : previewText}
                    </p>
                  )}
                  <div className="flex items-center gap-3 mt-2 flex-wrap">
                    {canExpand && (
                      <button
                        type="button"
                        onClick={() => toggleExpanded(ev.id)}
                        className="inline-flex items-center gap-1 text-xs font-medium text-brand-600 hover:text-brand-700"
                      >
                        {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                        {isExpanded ? t("rec.collapse") : t("rec.expand")}
                      </button>
                    )}
                    {ev.type === "prescription" ? (
                      <>
                        <button
                          type="button"
                          onClick={() => void viewPrescription(ev)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
                        >
                          <Eye size={14} />
                          {t("activityTimeline.view")}
                        </button>
                        <button
                          type="button"
                          onClick={() => reusePrescription(ev)}
                          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-600 hover:text-brand-500 border border-slate-200 hover:border-brand-200 px-3 py-1.5 rounded-lg transition"
                        >
                          <Copy size={14} />
                          {t("rx.reuse")}
                        </button>
                      </>
                    ) : moduleHref ? (
                      <Link
                        href={moduleHref}
                        className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-brand-600"
                      >
                        <ExternalLink size={12} />
                        {t("activityTimeline.openModule")}
                      </Link>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
      {pdfError && (
        <p className="text-xs text-rose-600">{pdfError}</p>
      )}
    </div>
  );
}
