"use client";

import { useState } from "react";
import { X } from "lucide-react";
import PlantIcon from "./PlantIcon";
import {
  MEDICINAL_PLANTS,
  mtPlantText,
} from "@/lib/medicinal-teas/data";
import type { MedicinalTeasLang } from "@/lib/medicinal-teas/types";

export default function PlantIngredientCard({
  plantId,
  accent,
  lang,
  ui,
}: {
  plantId: string;
  accent: string;
  lang: MedicinalTeasLang;
  ui: (key: string) => string;
}) {
  const [open, setOpen] = useState(false);
  const meta = MEDICINAL_PLANTS[plantId];
  const pt = mtPlantText(lang, plantId);
  if (!meta || !pt) return null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`w-full text-left rounded-2xl border bg-white p-4 transition hover:shadow-md ${
          open ? "border-brand-300 ring-2 ring-brand-100" : "border-slate-200 hover:border-brand-200"
        }`}
        aria-expanded={open}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
            style={{ backgroundColor: `${accent}22`, color: accent }}
          >
            <PlantIcon type={meta.icon} className="w-7 h-7" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-slate-900">{pt.name}</p>
            <p className="text-xs text-slate-500 italic mt-0.5">{meta.sci}</p>
            <span className="inline-block mt-2 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
              {pt.part}
            </span>
            <p className="text-xs text-brand-600 mt-2">{ui("ingHint")}</p>
          </div>
        </div>
      </button>

      {open && (
        <div className="mt-2 rounded-2xl border border-brand-100 bg-brand-50/40 p-4 space-y-3 text-sm">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="font-bold text-slate-900">{pt.name}</p>
              <p className="text-xs text-slate-500 italic">{meta.sci}</p>
            </div>
            <button type="button" onClick={() => setOpen(false)} className="text-slate-400 hover:text-slate-600 p-1" aria-label="Fechar">
              <X size={16} />
            </button>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1">{ui("ingPropriedades")}</p>
            <p className="text-slate-700 leading-relaxed">{pt.propriedades}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1">{ui("ingOndeNasce")}</p>
            <p className="text-slate-700 leading-relaxed">{pt.ondeNasce}</p>
          </div>
          <div>
            <p className="text-xs font-semibold text-slate-600 mb-1">{ui("ingAquisicao")}</p>
            <p className="text-slate-700 leading-relaxed">{pt.aquisicao}</p>
          </div>
        </div>
      )}
    </div>
  );
}
