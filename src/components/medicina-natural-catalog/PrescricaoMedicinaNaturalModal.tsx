"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, X } from "lucide-react";
import type { MedicinaNaturalDetailItem } from "@/lib/medicina-natural-catalog/api";
import StatusRegulatorioBadge from "./StatusRegulatorioBadge";
import type { StatusRegulatorio } from "@/lib/medicina-natural/item-types";

interface PrescricaoMedicinaNaturalModalProps {
  open: boolean;
  item: MedicinaNaturalDetailItem;
  actionLabel: string;
  onClose: () => void;
  onConfirm: () => void;
  t: (key: string) => string;
}

function AlertBlock({ title, body }: { title: string; body: string }) {
  if (!body.trim()) return null;
  return (
    <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3">
      <p className="text-xs font-semibold text-amber-900">{title}</p>
      <p className="text-sm text-amber-950 mt-1 leading-relaxed whitespace-pre-wrap">{body}</p>
    </div>
  );
}

export default function PrescricaoMedicinaNaturalModal({
  open,
  item,
  actionLabel,
  onClose,
  onConfirm,
  t,
}: PrescricaoMedicinaNaturalModalProps) {
  const [acknowledged, setAcknowledged] = useState(false);

  useEffect(() => {
    if (open) setAcknowledged(false);
  }, [open, item.slug]);

  if (!open) return null;

  const hasAlerts =
    item.contraindicacoes.trim() ||
    item.precaucoes.trim() ||
    item.alertaGestacaoPediatria?.trim() ||
    item.interacoesMedicamentosas?.trim();

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 p-5 border-b border-slate-100">
          <div className="min-w-0">
            <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wide">
              {t("nm.safety.eyebrow")}
            </p>
            <h2 className="font-bold text-slate-900 mt-1">{item.nome}</h2>
            <div className="mt-2">
              <StatusRegulatorioBadge status={item.statusRegulatorio as StatusRegulatorio} />
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 p-1 rounded-lg hover:bg-slate-100"
            aria-label={t("nm.safety.cancel")}
          >
            <X size={20} />
          </button>
        </div>

        <div className="p-5 overflow-y-auto flex-1 space-y-3">
          {!hasAlerts ? (
            <p className="text-sm text-slate-600 leading-relaxed">{t("nm.safety.noAlerts")}</p>
          ) : (
            <>
              <div className="flex items-start gap-2 text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                <p className="text-xs leading-relaxed">{t("nm.safety.lead")}</p>
              </div>
              <AlertBlock title={t("nm.detail.contraindicacoes")} body={item.contraindicacoes} />
              <AlertBlock title={t("nm.detail.precaucoes")} body={item.precaucoes} />
              <AlertBlock
                title={t("nm.detail.gestacaoPediatria")}
                body={item.alertaGestacaoPediatria || ""}
              />
              <AlertBlock
                title={t("nm.detail.interacoes")}
                body={item.interacoesMedicamentosas || ""}
              />
            </>
          )}

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 px-4 py-3 cursor-pointer">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(e) => setAcknowledged(e.target.checked)}
              className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-700 leading-relaxed">{t("nm.safety.checkbox")}</span>
          </label>
        </div>

        <div className="p-5 border-t border-slate-100 flex gap-2">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-700 font-semibold text-sm hover:bg-slate-50"
          >
            {t("nm.safety.cancel")}
          </button>
          <button
            type="button"
            disabled={!acknowledged}
            onClick={onConfirm}
            className="flex-[2] py-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold text-sm transition"
          >
            {actionLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
