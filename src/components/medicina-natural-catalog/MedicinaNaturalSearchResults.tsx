"use client";

import { BookOpen, Plus } from "lucide-react";
import { keepFocusOnPointerDown } from "@/lib/combobox-interaction";
import {
  cannabisFormaFarmaceuticaKey,
  cannabisReceituarioBadgeKey,
  formatCannabisComposition,
  parseDetalhesCannabis,
} from "@/lib/medicina-natural/cannabis-display";
import type { MedicinaNaturalListItem } from "@/lib/medicina-natural-catalog/search-server";
import StatusRegulatorioBadge from "./StatusRegulatorioBadge";
import type { StatusRegulatorio } from "@/lib/medicina-natural/item-types";

interface MedicinaNaturalSearchResultsProps {
  results: MedicinaNaturalListItem[];
  onSelect: (item: MedicinaNaturalListItem) => void;
  onViewLeaflet?: (item: MedicinaNaturalListItem) => void;
  className?: string;
  t?: (key: string) => string;
}

function CannabisReceituarioBadge({
  tipo,
  thcAcimaLimite,
  t,
}: {
  tipo: "A" | "B";
  thcAcimaLimite: boolean;
  t: (key: string) => string;
}) {
  const isA = tipo === "A";
  return (
    <span
      className={`inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full border ${
        isA
          ? "bg-amber-100 text-amber-900 border-amber-300"
          : "bg-teal-100 text-teal-900 border-teal-300"
      }`}
    >
      {t(cannabisReceituarioBadgeKey(tipo))}
    </span>
  );
}

export default function MedicinaNaturalSearchResults({
  results,
  onSelect,
  onViewLeaflet,
  className,
  t = (k) => k,
}: MedicinaNaturalSearchResultsProps) {
  if (results.length === 0) return null;

  const viewLeafletLabel = t("rx.leaflet.viewButton");
  const addLabel = t("rx.leaflet.addButton");

  return (
    <div
      className={`border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 overflow-y-auto ${className ?? "max-h-56"}`}
    >
      {results.map((item) => {
        const isCannabis = item.categoriaPratica === "CANNABIS";
        const det = isCannabis ? parseDetalhesCannabis(item.detalhesEspecificos) : null;

        return (
          <div
            key={item.slug}
            className="flex items-start gap-2 px-3 py-3 hover:bg-emerald-50/60 transition"
          >
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="font-semibold text-slate-900 text-base leading-snug">{item.nome}</p>
              {det && (
                <p className="text-xs text-slate-600">{formatCannabisComposition(det)}</p>
              )}
              {!det && item.nomeCientifico && (
                <p className="text-xs text-slate-500 italic">{item.nomeCientifico}</p>
              )}
              {item.posologia && (
                <p className="text-xs text-slate-400 line-clamp-2">{item.posologia}</p>
              )}
              {det?.thcAcimaLimite && (
                <p className="text-xs text-amber-800 bg-amber-50 border border-amber-100 rounded-lg px-2 py-1 mt-1">
                  {t("rx.cannabis.thcWarning")}
                </p>
              )}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {det ? (
                  <>
                    <CannabisReceituarioBadge
                      tipo={det.tipoReceituario}
                      thcAcimaLimite={det.thcAcimaLimite}
                      t={t}
                    />
                    <span className="inline-flex text-[10px] font-medium px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 border border-slate-200">
                      {t(cannabisFormaFarmaceuticaKey(det.formaFarmaceutica))}
                    </span>
                  </>
                ) : (
                  <StatusRegulatorioBadge status={item.statusRegulatorio as StatusRegulatorio} />
                )}
              </div>
            </div>
            <div className="flex flex-col gap-1 shrink-0">
              {onViewLeaflet && (
                <button
                  type="button"
                  onMouseDown={keepFocusOnPointerDown}
                  onClick={() => onViewLeaflet(item)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-[10px] font-semibold text-slate-600 transition"
                  title={viewLeafletLabel}
                >
                  <BookOpen size={12} aria-hidden />
                  <span className="hidden sm:inline">{viewLeafletLabel}</span>
                </button>
              )}
              <button
                type="button"
                onMouseDown={keepFocusOnPointerDown}
                onClick={() => onSelect(item)}
                className="inline-flex items-center justify-center gap-1 px-2 py-1 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-semibold transition"
                title={addLabel}
              >
                <Plus size={14} aria-hidden />
                <span className="hidden sm:inline">{addLabel}</span>
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
