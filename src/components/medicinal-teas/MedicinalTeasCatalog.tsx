"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowLeft, ChevronDown, ChevronUp, Search } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import {
  filterCatalog,
  mtLang,
  mtTeaText,
  mtUiString,
  teasForCatalogPlant,
} from "@/lib/medicinal-teas/data";
import {
  detectMedicinalTeasPortal,
  medicinalTeasBasePath,
} from "@/lib/medicinal-teas/portal-config";

export default function MedicinalTeasCatalog() {
  const { lang } = useI18n();
  const ml = mtLang(lang);
  const ui = (key: string) => mtUiString(ml, key);
  const pathname = usePathname();
  const portal = detectMedicinalTeasPortal(pathname);
  const base = medicinalTeasBasePath(portal);
  const href = (path: string) =>
    portal === "professional" ? mapProfessionalPathToPortal(pathname, path) : path;

  const [query, setQuery] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const filtered = useMemo(() => {
    const list = filterCatalog(query, ml);
    return [...list].sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  }, [query, ml]);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <Link href={href(base)} className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 hover:text-brand-800">
        <ArrowLeft size={16} /> {ui("navBack")}
      </Link>

      <div>
        <p className="text-xs font-semibold text-brand-600 uppercase tracking-wide">{ui("catalogTag")}</p>
        <h1 className="text-2xl font-bold text-slate-900 mt-1">{ui("catalogTitle")}</h1>
        <p className="text-slate-500 mt-2">{ui("catalogLead")}</p>
      </div>

      <div className="relative">
        <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={ui("catalogSearchPlaceholder")}
          className="w-full pl-11 pr-4 py-3 rounded-2xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
        />
      </div>

      {filtered.length === 0 ? (
        <p className="text-center text-sm text-slate-500 py-12">{ui("noResultsCatalog")}</p>
      ) : (
        <div className="space-y-3">
          {filtered.map((plant) => {
            const open = expanded === plant.slug;
            const relatedTeas = teasForCatalogPlant(plant, ml);
            return (
              <div key={plant.slug} className="rounded-2xl border border-slate-200 bg-white overflow-hidden">
                <button
                  type="button"
                  onClick={() => setExpanded(open ? null : plant.slug)}
                  className="w-full flex items-start justify-between gap-4 p-5 text-left hover:bg-slate-50 transition"
                >
                  <div className="min-w-0">
                    <p className="font-bold text-slate-900">{plant.name}</p>
                    <p className="text-xs text-slate-500 italic mt-0.5">{plant.sci}</p>
                    <p className="text-xs text-slate-400 mt-1">{plant.partes}</p>
                  </div>
                  {open ? <ChevronUp size={18} className="text-slate-400 shrink-0" /> : <ChevronDown size={18} className="text-slate-400 shrink-0" />}
                </button>
                {open && (
                  <div className="px-5 pb-5 pt-0 space-y-3 text-sm border-t border-slate-100">
                    {plant.sinonimia && plant.sinonimia !== "desconhecida" && (
                      <p><span className="font-semibold text-slate-700">Sinonímia: </span>{plant.sinonimia}</p>
                    )}
                    <p><span className="font-semibold text-slate-700">Características: </span>{plant.caracteristicas}</p>
                    <p><span className="font-semibold text-slate-700">Habitat: </span>{plant.habitat}</p>
                    <p><span className="font-semibold text-slate-700">Propriedades: </span>{plant.propriedades}</p>
                    {relatedTeas.length > 0 && (
                      <div>
                        <p className="font-semibold text-slate-700 mb-2">{ui("ingUsadoChas")}</p>
                        <div className="flex flex-wrap gap-2">
                          {relatedTeas.map((tea) => {
                            const tx = mtTeaText(ml, tea.slug);
                            if (!tx) return null;
                            return (
                              <Link
                                key={tea.slug}
                                href={href(`${base}/${tea.slug}`)}
                                className="text-xs font-semibold px-3 py-1 rounded-full bg-brand-50 text-brand-700 hover:bg-brand-100"
                              >
                                {tx.name}
                              </Link>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-slate-500 leading-relaxed border-t border-slate-100 pt-4">
        {ui("footerDisclaimerCatalog")}
      </p>
    </div>
  );
}
