"use client";

import { useState } from "react";
import { BookOpen, ChevronDown, ChevronUp } from "lucide-react";
import { translate } from "@/lib/i18n/translations";
import {
  getReferenceSections,
  renderReferenceSectionBody,
} from "@/lib/pics/reference-library";

type Lang = "pt" | "en" | "es";

interface IntegrativeReferenceLibraryProps {
  lang: Lang;
  practiceSlug: string;
  dark?: boolean;
}

export default function IntegrativeReferenceLibrary({
  lang,
  practiceSlug,
  dark = false,
}: IntegrativeReferenceLibraryProps) {
  const t = (key: string) => translate(lang, key);
  const sections = getReferenceSections(practiceSlug);
  const [open, setOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(
    sections[0]?.id ?? null,
  );

  if (sections.length === 0) return null;

  const shell = dark
    ? "bg-slate-800/80 border border-slate-700 rounded-xl"
    : "bg-slate-50 border border-slate-200 rounded-2xl";
  const title = dark ? "text-xs font-semibold text-slate-300" : "text-xs font-semibold text-slate-700";
  const itemTitle = dark ? "text-xs font-medium text-teal-300" : "text-xs font-medium text-teal-800";
  const bodyText = dark ? "text-[11px] text-slate-400 leading-relaxed" : "text-[11px] text-slate-600 leading-relaxed";

  return (
    <div className={shell}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full flex items-center justify-between gap-2 px-3 py-2.5 ${title}`}
      >
        <span className="flex items-center gap-1.5">
          <BookOpen size={14} className="text-teal-500" />
          {t("it.ref.title")}
        </span>
        {open ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
      </button>

      {open && (
        <div className="px-3 pb-3 space-y-2">
          {sections.map((section) => {
            const isExpanded = expandedId === section.id;
            const lines = renderReferenceSectionBody(section, lang);
            return (
              <div
                key={section.id}
                className={dark ? "rounded-lg border border-slate-700" : "rounded-lg border border-slate-200 bg-white"}
              >
                <button
                  type="button"
                  onClick={() => setExpandedId(isExpanded ? null : section.id)}
                  className={`w-full flex items-center justify-between px-3 py-2 ${itemTitle}`}
                >
                  {t(section.titleKey)}
                  {isExpanded ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                </button>
                {isExpanded && (
                  <div className={`px-3 pb-3 space-y-1 ${bodyText}`}>
                    {lines.map((line) => (
                      <p key={line}>{line}</p>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
