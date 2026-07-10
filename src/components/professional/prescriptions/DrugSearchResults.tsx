import { Plus } from "lucide-react";
import { keepFocusOnPointerDown } from "@/lib/combobox-interaction";

export type DrugSearchResult = {
  id: string;
  name: string;
  activeIngredient: string;
  presentation: string;
  manufacturer: string | null;
  controlled: boolean;
  prescriptionType: string | null;
  ggremCode?: string | null;
  externalCode?: string | null;
  country?: string;
  category?: string | null;
  pharmaceuticalForm?: string | null;
  dosage?: string | null;
};

export type ControlInfo = {
  tarja: "preta" | "vermelha";
  label: string;
  receita: string;
} | null;

interface DrugSearchResultsProps {
  results: DrugSearchResult[];
  onSelect: (drug: DrugSearchResult) => void;
  controlInfo: (type: string | null | undefined) => ControlInfo;
  className?: string;
}

export default function DrugSearchResults({
  results,
  onSelect,
  controlInfo,
  className,
}: DrugSearchResultsProps) {
  if (results.length === 0) return null;

  return (
    <div className={`border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 overflow-y-auto ${className ?? "max-h-56"}`}>
      {results.map((drug) => {
        const ci = controlInfo(drug.prescriptionType);
        const showIngredient = drug.activeIngredient.trim().toLowerCase() !== drug.name.trim().toLowerCase();

        return (
          <button
            key={drug.id}
            type="button"
            onMouseDown={keepFocusOnPointerDown}
            onClick={() => onSelect(drug)}
            className="w-full flex items-start gap-3 px-4 py-3 hover:bg-brand-50 transition text-left"
          >
            <div className="flex-1 min-w-0 space-y-0.5">
              <p className="font-semibold text-slate-900 text-base flex items-center gap-2 flex-wrap leading-snug">
                {drug.name}
                {drug.controlled && ci && (
                  <span
                    className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                      ci.tarja === "preta" ? "bg-slate-800 text-white" : "bg-red-100 text-red-600"
                    }`}
                  >
                    {ci.label}
                  </span>
                )}
              </p>
              {showIngredient && (
                <p className="text-xs text-slate-500">{drug.activeIngredient}</p>
              )}
              {drug.manufacturer && (
                <p className="text-xs text-slate-500">{drug.manufacturer}</p>
              )}
              <p className="text-xs text-slate-400">{drug.presentation}</p>
              {drug.ggremCode ? (
                <p className="text-[10px] text-slate-300 font-mono">GGREM {drug.ggremCode}</p>
              ) : drug.externalCode ? (
                <p className="text-[10px] text-slate-300 font-mono">CUM {drug.externalCode}</p>
              ) : null}
            </div>
            <Plus size={16} className="text-brand-500 shrink-0 mt-1" />
          </button>
        );
      })}
    </div>
  );
}
