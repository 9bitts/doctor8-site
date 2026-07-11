"use client";

import Link from "next/link";
import { AlertTriangle, Leaf } from "lucide-react";
import type { MedicinaNaturalListItem } from "@/lib/medicina-natural-catalog/search-server";
import StatusRegulatorioBadge from "./StatusRegulatorioBadge";
import type { StatusRegulatorio } from "@/lib/medicina-natural/item-types";

interface MedicinaNaturalItemCardProps {
  item: MedicinaNaturalListItem;
  href: string;
  renisusLabel: string;
}

export default function MedicinaNaturalItemCard({
  item,
  href,
  renisusLabel,
}: MedicinaNaturalItemCardProps) {
  return (
    <Link
      href={href}
      className="group block bg-white rounded-2xl border border-slate-200 p-5 hover:border-emerald-200 hover:shadow-sm transition"
    >
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center shrink-0">
          <Leaf size={18} className="text-emerald-600" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-semibold text-slate-900 group-hover:text-emerald-700 transition truncate">
            {item.nome}
          </p>
          {item.nomeCientifico && (
            <p className="text-xs text-slate-500 italic mt-0.5 line-clamp-1">{item.nomeCientifico}</p>
          )}
          {item.nomesAlternativos.length > 0 && (
            <p className="text-xs text-slate-400 mt-1 line-clamp-1">
              {item.nomesAlternativos.slice(0, 3).join(" · ")}
            </p>
          )}
          <div className="flex flex-wrap gap-1.5 mt-2.5">
            <StatusRegulatorioBadge status={item.statusRegulatorio as StatusRegulatorio} />
            {item.renisus && (
              <span className="inline-flex text-[10px] font-bold px-2 py-0.5 rounded-full bg-violet-100 text-violet-800 border border-violet-200">
                {renisusLabel}
              </span>
            )}
            {item.alertaGestacaoPediatria?.trim() && (
              <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-100 text-rose-800 border border-rose-200">
                <AlertTriangle size={10} />
                Gest./Ped.
              </span>
            )}
          </div>
        </div>
      </div>
    </Link>
  );
}
