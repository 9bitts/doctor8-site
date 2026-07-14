"use client";

import { createPortal } from "react-dom";
import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";
import { CANNABIS_TCLE_BULLETS_PT } from "@/lib/cannabis-medicinal-tcle";

type Props = {
  open: boolean;
  onClose: () => void;
  onAccept: () => void;
};

export default function CannabisMedicinalTcleModal({ open, onClose, onAccept }: Props) {
  const t = useT();
  const [accepted, setAccepted] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  useEffect(() => {
    if (!open) setAccepted(false);
  }, [open]);

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
        aria-labelledby="cannabis-tcle-title"
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden"
      >
        <div className="px-5 py-4 border-b border-slate-100 flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-lime-700">
              {t("rx.cannabis.tcleEyebrow")}
            </p>
            <h2 id="cannabis-tcle-title" className="text-lg font-bold text-slate-900 mt-0.5">
              {t("rx.cannabis.tcleTitle")}
            </h2>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1">
            <X size={18} />
          </button>
        </div>
        <div className="px-5 py-4 space-y-3 max-h-[60vh] overflow-y-auto">
          <p className="text-sm text-slate-600 leading-relaxed">{t("rx.cannabis.tcleSummary")}</p>
          <ul className="text-sm text-slate-600 space-y-2 list-disc pl-5">
            {CANNABIS_TCLE_BULLETS_PT.map((bullet) => (
              <li key={bullet}>{bullet}</li>
            ))}
          </ul>
          <label className="flex items-start gap-3 rounded-xl border border-lime-200 bg-lime-50/60 p-3 cursor-pointer">
            <input
              type="checkbox"
              checked={accepted}
              onChange={(e) => setAccepted(e.target.checked)}
              className="mt-1 accent-lime-600"
            />
            <span className="text-sm text-slate-700">{t("rx.cannabis.tcleAccept")}</span>
          </label>
        </div>
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
            disabled={!accepted}
            onClick={onAccept}
            className="px-4 py-2.5 rounded-xl text-sm font-semibold bg-lime-700 text-white hover:bg-lime-800 disabled:opacity-50"
          >
            {t("rx.cannabis.tcleContinue")}
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
