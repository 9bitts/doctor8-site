"use client";

import { Plus } from "lucide-react";
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
  className,
  t = (k) => k,
}: MedicinaNaturalSearchResultsProps) {
  if (results.length === 0) return null;

  return (
    <div
      className={`border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 overflow-y-auto ${className ?? "max-h-56"}`}
    >
      {results.map((item) => {
        const isCannabis = item.categoriaPratica === "CANNABIS";
        const det = isCannabis ? parseDetalhesCannabis(item.detalhesEspecificos) : null;

        return (
          <button
            key={item.slug}
            type="button"
            onMouseDown={keepFocusOnPointerDown}
            onClick={() => onSelect(item)}
            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-emerald-50 transition text-left"
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
            <Plus size={16} className="text-emerald-500 shrink-0 mt-1" />
          </button>
        );
      })}
    </div>
  );
}
