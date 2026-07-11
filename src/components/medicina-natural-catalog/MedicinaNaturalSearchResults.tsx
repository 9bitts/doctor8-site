"use client";

import { Plus } from "lucide-react";
import { keepFocusOnPointerDown } from "@/lib/combobox-interaction";
import type { MedicinaNaturalListItem } from "@/lib/medicina-natural-catalog/search-server";
import StatusRegulatorioBadge from "./StatusRegulatorioBadge";
import type { StatusRegulatorio } from "@/lib/medicina-natural/item-types";

interface MedicinaNaturalSearchResultsProps {
  results: MedicinaNaturalListItem[];
  onSelect: (item: MedicinaNaturalListItem) => void;
  className?: string;
}

export default function MedicinaNaturalSearchResults({
  results,
  onSelect,
  className,
}: MedicinaNaturalSearchResultsProps) {
  if (results.length === 0) return null;

  return (
    <div
      className={`border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 overflow-y-auto ${className ?? "max-h-56"}`}
    >
      {results.map((item) => (
        <button
          key={item.slug}
          type="button"
          onMouseDown={keepFocusOnPointerDown}
          onClick={() => onSelect(item)}
          className="w-full flex items-start gap-3 px-4 py-3 hover:bg-emerald-50 transition text-left"
        >
          <div className="flex-1 min-w-0 space-y-0.5">
            <p className="font-semibold text-slate-900 text-base leading-snug">{item.nome}</p>
            {item.nomeCientifico && (
              <p className="text-xs text-slate-500 italic">{item.nomeCientifico}</p>
            )}
            {item.posologia && (
              <p className="text-xs text-slate-400 line-clamp-2">{item.posologia}</p>
            )}
            <div className="pt-1">
              <StatusRegulatorioBadge status={item.statusRegulatorio as StatusRegulatorio} />
            </div>
          </div>
          <Plus size={16} className="text-emerald-500 shrink-0 mt-1" />
        </button>
      ))}
    </div>
  );
}
