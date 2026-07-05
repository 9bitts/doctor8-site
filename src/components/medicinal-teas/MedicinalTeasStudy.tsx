"use client";

import { Fragment, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import { MEDICINAL_STUDY, mtLang, mtUiString } from "@/lib/medicinal-teas/data";
import type { StudyBlock } from "@/lib/medicinal-teas/types";
import {
  detectMedicinalTeasPortal,
  medicinalTeasBasePath,
} from "@/lib/medicinal-teas/portal-config";

function StudyInline({ text }: { text: string }) {
  const parts = text.split(/\*\*(.+?)\*\*/g);
  if (parts.length === 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, i) => (
        <Fragment key={i}>{i % 2 === 1 ? <strong>{part}</strong> : part}</Fragment>
      ))}
    </>
  );
}

function StudyBlockView({
  block,
  catalogHref,
}: {
  block: StudyBlock;
  catalogHref: string;
}) {
  if (block.h) {
    return <h4 className="font-semibold text-slate-800 mt-4 mb-1">{block.h}</h4>;
  }
  if (block.list) {
    return (
      <ul className="list-disc pl-5 space-y-2 text-slate-700 leading-relaxed">
        {block.list.map((item) => (
          <li key={item.slice(0, 40)}>
            <StudyInline text={item} />
          </li>
        ))}
      </ul>
    );
  }
  if (block.link) {
    const href = block.link.href === "catalogo.html" ? catalogHref : block.link.href;
    return (
      <Link
        href={href}
        className="inline-flex text-sm font-semibold px-4 py-2 rounded-full border border-brand-200 bg-brand-50 text-brand-700 hover:bg-brand-100 mt-2"
      >
        {block.link.label}
      </Link>
    );
  }
  if (block.p) {
    return (
      <p className="text-slate-700 leading-relaxed">
        <StudyInline text={block.p} />
      </p>
    );
  }
  return null;
}

export default function MedicinalTeasStudy() {
  const { lang } = useI18n();
  const ml = mtLang(lang);
  const ui = (key: string) => mtUiString(ml, key);
  const pathname = usePathname();
  const portal = detectMedicinalTeasPortal(pathname);
  const base = medicinalTeasBasePath(portal);
  const href = (path: string) =>
    portal === "professional" ? mapProfessionalPathToPortal(pathname, path) : path;

  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<number | null>(0);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return MEDICINAL_STUDY.map((section, index) => ({ section, index }));
    return MEDICINAL_STUDY
      .map((section, index) => ({ section, index }))
      .filter(({ section }) => section.title.toLowerCase().includes(q));
  }, [query]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <Link href={href(base)} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-800">
        <ArrowLeft size={16} /> {ui("navBack")}
      </Link>

      <div>
        <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">{ui("estudoTag")}</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{ui("estudoTitle")}</h1>
        <p className="text-slate-500 mt-2">{ui("estudoLead")}</p>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={ui("estudoSearchPlaceholder")}
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-slate-500 py-12">{ui("noResultsEstudo")}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map(({ section, index }) => {
            const open = expanded === index;
            return (
              <div key={index} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : index)}
                  className="w-full flex items-center justify-between gap-4 p-5 text-left hover:bg-slate-50 transition"
                >
                  <p className="font-bold text-slate-900 pr-4">{section.title}</p>
                  {open ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
                </button>
                {open && (
                  <div className="px-5 pb-5 pt-0 space-y-3 text-sm border-t border-slate-100">
                    {section.blocks.map((block, bi) => (
                      <StudyBlockView
                        key={bi}
                        block={block}
                        catalogHref={href(`${base}/catalogo`)}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
        {ui("footerDisclaimerEstudo")}
      </p>
    </div>
  );
}
