"use client";

import { useEffect, useState } from "react";
import {
  BookOpen,
  ChevronDown,
  ExternalLink,
  Loader2,
  X,
} from "lucide-react";
import type { DrugLeafletPayload, DrugLeafletTarget } from "@/lib/drug-leaflet/types";

type DrugLeafletPanelProps = {
  target: DrugLeafletTarget | null;
  apiBase: string;
  t: (key: string) => string;
  onClose: () => void;
  onInsertPosology?: (excerpt: string) => void;
  className?: string;
};

const MAX_SECTION_CHARS = 12_000;

function normalizeSections(
  raw: DrugLeafletPayload["sections"] | unknown,
): DrugLeafletPayload["sections"] {
  if (!Array.isArray(raw)) return [];
  const out: DrugLeafletPayload["sections"] = [];
  for (const item of raw) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const key = typeof o.key === "string" ? o.key : "";
    const title = typeof o.title === "string" ? o.title.trim() : "";
    let content = typeof o.content === "string" ? o.content.trim() : "";
    if (!key || !content) continue;
    if (content.length > MAX_SECTION_CHARS) {
      content = `${content.slice(0, MAX_SECTION_CHARS)}\n\n…`;
    }
    out.push({
      key: key as DrugLeafletPayload["sections"][number]["key"],
      title: title || key,
      content,
      defaultOpen: o.defaultOpen === true || key === "posologia",
    });
  }
  return out;
}

function LeafletAccordion({
  sections,
  t,
  onInsertPosology,
  posologyExcerpt,
}: {
  sections: DrugLeafletPayload["sections"];
  t: (key: string) => string;
  onInsertPosology?: (excerpt: string) => void;
  posologyExcerpt?: string;
}) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(() => {
    const initial = new Set<string>();
    for (const s of sections) {
      if (s.defaultOpen) initial.add(s.key);
    }
    if (initial.size === 0 && sections.length > 0) {
      initial.add(sections[0].key);
    }
    return initial;
  });

  useEffect(() => {
    const initial = new Set<string>();
    for (const s of sections) {
      if (s.defaultOpen) initial.add(s.key);
    }
    if (initial.size === 0 && sections.length > 0) {
      initial.add(sections[0].key);
    }
    setOpenKeys(initial);
  }, [sections]);

  const toggle = (key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  return (
    <div className="space-y-2">
      {sections.map((section, idx) => {
        const open = openKeys.has(section.key);
        const isPosology = section.key === "posologia";
        return (
          <div
            key={`${section.key}-${idx}`}
            className="border border-slate-100 rounded-xl overflow-hidden bg-white"
          >
            <button
              type="button"
              onClick={() => toggle(section.key)}
              className="w-full flex items-center justify-between gap-3 px-3 py-2.5 text-left text-sm font-semibold text-slate-800 hover:bg-slate-50 transition"
            >
              <span>{section.title}</span>
              <ChevronDown
                size={16}
                className={`shrink-0 text-slate-400 transition-transform ${open ? "rotate-180" : ""}`}
              />
            </button>
            {open && (
              <div className="px-3 pb-3 space-y-2">
                <p className="text-sm text-slate-600 leading-relaxed whitespace-pre-wrap break-words">
                  {section.content}
                </p>
                {isPosology && posologyExcerpt && onInsertPosology && (
                  <button
                    type="button"
                    onClick={() => onInsertPosology(posologyExcerpt)}
                    className="text-xs font-semibold text-brand-600 hover:text-brand-700"
                  >
                    {t("rx.leaflet.insertPosology")}
                  </button>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function DrugLeafletPanel({
  target,
  apiBase,
  t,
  onClose,
  onInsertPosology,
  className,
}: DrugLeafletPanelProps) {
  const [leaflet, setLeaflet] = useState<DrugLeafletPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const targetKey =
    target == null
      ? ""
      : target.kind === "drug"
        ? `drug:${target.drugId}`
        : `mn:${target.slug}`;

  useEffect(() => {
    if (!target) {
      setLeaflet(null);
      setError("");
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLeaflet(null);
    setError("");
    setLoading(true);

    const params = new URLSearchParams();
    if (target.kind === "drug") params.set("drugId", target.drugId);
    else params.set("mnSlug", target.slug);

    void (async () => {
      try {
        const res = await fetch(`${apiBase}/drugs/leaflet?${params}`);
        if (cancelled) return;

        if (!res.ok) {
          setError(t(res.status === 404 ? "rx.leaflet.notFound" : "rx.leaflet.loadError"));
          setLeaflet(null);
          return;
        }

        const data = (await res.json()) as { leaflet?: DrugLeafletPayload | null };
        if (cancelled) return;

        if (data.leaflet && typeof data.leaflet === "object") {
          setLeaflet({
            ...data.leaflet,
            sections: normalizeSections(data.leaflet.sections),
          });
        } else {
          setError(t("rx.leaflet.notFound"));
          setLeaflet(null);
        }
      } catch {
        if (!cancelled) {
          setError(t("rx.leaflet.loadError"));
          setLeaflet(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
    // Intentionally depend on targetKey (not `t`) to avoid cancel/restart loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- stable fetch identity
  }, [apiBase, targetKey]);

  if (!target) {
    return (
      <div
        className={`flex flex-col items-center justify-center text-center p-6 bg-slate-50/80 border-l border-slate-100 ${className ?? ""}`}
      >
        <BookOpen size={32} className="text-slate-300 mb-3" aria-hidden />
        <p className="text-sm text-slate-500 max-w-xs">{t("rx.leaflet.emptyHint")}</p>
      </div>
    );
  }

  const sourceLabel =
    leaflet?.source === "doctor8_mn"
      ? t("rx.leaflet.sourceMn")
      : leaflet?.source === "anvisa"
        ? t("rx.leaflet.sourceAnvisa")
        : t("rx.leaflet.sourceCatalog");

  const sections = normalizeSections(leaflet?.sections);

  return (
    <div className={`flex flex-col h-full min-h-0 bg-white text-slate-900 ${className ?? ""}`}>
      <div className="flex items-start justify-between gap-2 p-3 border-b border-slate-100 bg-white shrink-0">
        <div className="min-w-0 flex-1">
          <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">
            {t("rx.leaflet.panelTitle")}
          </p>
          <h4 className="font-bold text-slate-900 text-sm leading-snug break-words">
            {target.displayName}
          </h4>
          {leaflet?.subtitle && (
            <p className="text-xs text-slate-500 break-words">{leaflet.subtitle}</p>
          )}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 p-2 -mr-1 rounded-lg text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition"
          aria-label={t("rx.leaflet.close")}
        >
          <X size={20} />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto overscroll-contain p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] space-y-3 min-h-0">
        {loading && (
          <div className="flex flex-col items-center justify-center py-12 gap-2">
            <Loader2 size={22} className="animate-spin text-brand-400" />
            <p className="text-xs text-slate-500">{t("rx.leaflet.loading")}</p>
          </div>
        )}

        {!loading && error && (
          <div className="space-y-3 py-6 px-2 text-center">
            <p className="text-sm text-slate-500">{error}</p>
            {leaflet?.externalUrl && (
              <a
                href={leaflet.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                <ExternalLink size={14} />
                {t("rx.leaflet.openAnvisa")}
              </a>
            )}
          </div>
        )}

        {!loading && !error && leaflet && sections.length === 0 && (
          <div className="space-y-3 py-6 px-2 text-center">
            <p className="text-sm text-slate-500">{t("rx.leaflet.notFound")}</p>
            {leaflet.externalUrl && (
              <a
                href={leaflet.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                <ExternalLink size={14} />
                {t("rx.leaflet.openAnvisa")}
              </a>
            )}
          </div>
        )}

        {!loading && !error && leaflet && sections.length > 0 && (
          <>
            <p className="text-[10px] font-medium text-slate-400 uppercase tracking-wide">
              {sourceLabel}
            </p>
            <LeafletAccordion
              sections={sections}
              t={t}
              onInsertPosology={onInsertPosology}
              posologyExcerpt={leaflet.posologyExcerpt}
            />
            {leaflet.posologyExcerpt && onInsertPosology && (
              <button
                type="button"
                onClick={() => onInsertPosology(leaflet.posologyExcerpt!)}
                className="w-full py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 text-white text-xs font-semibold transition"
              >
                {t("rx.leaflet.insertPosology")}
              </button>
            )}
            {leaflet.externalUrl && (
              <a
                href={leaflet.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-brand-600 hover:text-brand-700"
              >
                <ExternalLink size={14} />
                {t("rx.leaflet.openAnvisa")}
              </a>
            )}
            <p className="text-[10px] text-slate-400 leading-relaxed border-t border-slate-100 pt-2">
              {t("rx.leaflet.disclaimer")}
            </p>
          </>
        )}
      </div>
    </div>
  );
}
