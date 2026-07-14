"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";
import type { PhytoInteractionWarning } from "@/lib/medicina-natural/phyto-interactions";

type Props = {
  open: boolean;
  warnings: PhytoInteractionWarning[];
  onClose: () => void;
  onConfirm: () => void;
};

export default function PhytoInteractionConfirmModal({
  open,
  warnings,
  onClose,
  onConfirm,
}: Props) {
  const t = useT();
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || !open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[200] flex items-end sm:items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/50"
        aria-label={t("common.close")}
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-amber-200 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-amber-100 flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100 flex items-center justify-center shrink-0">
            <AlertTriangle size={20} className="text-amber-700" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-slate-900">{t("rx.phytoInteraction.title")}</h2>
            <p className="text-sm text-slate-500 mt-0.5">{t("rx.phytoInteraction.subtitle")}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        </div>
        <ul className="px-5 py-4 space-y-2 max-h-[50vh] overflow-y-auto">
          {warnings.map((w) => (
            <li key={`${w.herb}-${w.drug}`} className="text-sm text-slate-700 rounded-xl bg-amber-50 border border-amber-100 px-3 py-2">
              {w.description}
            </li>
          ))}
        </ul>
        <div className="px-5 py-4 border-t border-slate-100 flex flex-col-reverse sm:flex-row gap-2 sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            {t("common.cancel")}
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-amber-600 text-white hover:bg-amber-700"
          >
            {t("rx.phytoInteraction.confirm")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
