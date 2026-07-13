"use client";

import { useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BookOpen,
  ChevronDown,
  ChevronRight,
  GraduationCap,
  Search,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  COMO_USAR_GUIDE,
  detectPortalFromPath,
  type GuidePortalId,
  type GuideSection,
} from "@/lib/como-usar-guide";

const PORTAL_SECTION_MAP: Record<GuidePortalId, string> = {
  professional: "medicos",
  psychologist: "psicologos",
  nutritionist: "nutricionistas",
  nurse: "enfermeiros",
  pharmacist: "farmaceuticos",
  dentist: "dentistas",
  psychoanalyst: "psicanalistas",
  "integrative-therapist": "terapeutas-integrativos",
};

function SectionCard({
  section,
  isHighlighted,
  badge,
  defaultOpen,
}: {
  section: GuideSection;
  isHighlighted: boolean;
  badge?: string;
  defaultOpen: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  return (
    <section
      id={section.id}
      className={`scroll-mt-24 rounded-2xl border bg-white shadow-sm transition-shadow ${
        isHighlighted
          ? "border-blue-300 ring-2 ring-blue-100"
          : "border-slate-200"
      }`}
    >
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-start gap-3 p-5 text-left hover:bg-slate-50/80 rounded-2xl transition-colors"
      >
        <span className="mt-0.5 text-slate-400 shrink-0">
          {open ? <ChevronDown size={18} /> : <ChevronRight size={18} />}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="text-base font-bold text-slate-900">{section.title}</h2>
            {badge && (
              <span className="text-[10px] uppercase tracking-wider font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
                {badge}
              </span>
            )}
          </div>
          {section.intro && (
            <p className="text-sm text-slate-500 mt-1 leading-relaxed">{section.intro}</p>
          )}
        </div>
        <span className="text-xs text-slate-400 shrink-0">
          {section.features.length} {section.features.length === 1 ? "item" : "itens"}
        </span>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4 border-t border-slate-100 pt-4">
          {section.features.map((feature, idx) => (
            <div
              key={`${section.id}-${idx}`}
              className="rounded-xl border border-slate-100 bg-slate-50/50 p-4"
            >
              <h3 className="text-sm font-semibold text-slate-800">{feature.title}</h3>
              <p className="text-sm text-slate-600 mt-1 leading-relaxed">
                {feature.description}
              </p>
              {feature.bullets && feature.bullets.length > 0 && (
                <ul className="mt-2 space-y-1 text-sm text-slate-600 list-disc pl-5">
                  {feature.bullets.map((bullet, bidx) => (
                    <li key={bidx} className="leading-relaxed">
                      {bullet}
                    </li>
                  ))}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

export default function ComoUsarGuide() {
  const { lang } = useI18n();
  const pathname = usePathname();
  const portal = detectPortalFromPath(pathname);
  const content = COMO_USAR_GUIDE[lang] ?? COMO_USAR_GUIDE.pt;
  const [query, setQuery] = useState("");

  const portalSectionId = PORTAL_SECTION_MAP[portal];

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return content.sections;
    return content.sections
      .map((section) => {
        const features = section.features.filter(
          (f) =>
            f.title.toLowerCase().includes(q) ||
            f.description.toLowerCase().includes(q) ||
            f.bullets?.some((b) => b.toLowerCase().includes(q)),
        );
        const sectionMatch =
          section.title.toLowerCase().includes(q) ||
          section.intro?.toLowerCase().includes(q);
        if (sectionMatch) return section;
        if (features.length > 0) return { ...section, features };
        return null;
      })
      .filter(Boolean) as GuideSection[];
  }, [content.sections, query]);

  const orderedSections = useMemo(() => {
    const highlighted = filteredSections.find((s) => s.id === portalSectionId);
    const rest = filteredSections.filter((s) => s.id !== portalSectionId);
    if (!highlighted) return filteredSections;
    return [highlighted, ...rest];
  }, [filteredSections, portalSectionId]);

  return (
    <div className="max-w-6xl mx-auto pb-12">
      {/* Hero */}
      <div className="flex items-start gap-4 mb-8">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-200 shrink-0">
          <GraduationCap className="w-7 h-7 text-white" />
        </div>
        <div>
          <p className="text-xs uppercase tracking-wider text-blue-600 font-semibold mb-1">
            Doctor8
          </p>
          <h1 className="text-2xl font-bold text-slate-900">{content.pageTitle}</h1>
          <p className="text-slate-500 mt-1 leading-relaxed max-w-2xl">
            {content.pageSubtitle}
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        {/* TOC sidebar */}
        <aside className="lg:w-56 shrink-0">
          <div className="lg:sticky lg:top-24 space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar..."
                className="w-full pl-9 pr-3 py-2 text-sm rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-300"
              />
            </div>

            <nav className="hidden lg:block p-4 rounded-2xl border border-slate-200 bg-white shadow-sm">
              <p className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-3 flex items-center gap-1.5">
                <BookOpen size={12} />
                {content.tocTitle}
              </p>
              <ul className="space-y-1 text-sm">
                {content.sections.map((section) => (
                  <li key={section.id}>
                    <a
                      href={`#${section.id}`}
                      className={`block px-2 py-1.5 rounded-lg hover:bg-slate-50 transition-colors ${
                        section.id === portalSectionId
                          ? "text-blue-700 font-medium bg-blue-50"
                          : "text-slate-600"
                      }`}
                    >
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </nav>
          </div>
        </aside>

        {/* Sections */}
        <div className="flex-1 space-y-4 min-w-0">
          {orderedSections.length === 0 && (
            <p className="text-sm text-slate-500 p-6 rounded-2xl border border-slate-200 bg-white">
              Nenhum resultado para &ldquo;{query}&rdquo;.
            </p>
          )}
          {orderedSections.map((section, idx) => (
            <SectionCard
              key={section.id}
              section={section}
              isHighlighted={section.id === portalSectionId}
              badge={
                section.id === portalSectionId ? content.yourPortalBadge : undefined
              }
              defaultOpen={
                section.id === portalSectionId || idx === 0 || !query
              }
            />
          ))}
        </div>
      </div>
    </div>
  );
}
