"use client";

import { useState } from "react";
import {
  PenLine, Smartphone, Lock, Loader2, AlertCircle, X, ExternalLink,
} from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";

export type EmissionKind = "prescription" | "exam" | "document";

export interface SignTarget {
  kind: EmissionKind;
  id: string;
  label: string;
}

export function EmissionsSignModal({
  target,
  signConfig,
  deliverAfter,
  onClose,
}: {
  target: SignTarget;
  signConfig: { configured: boolean; cpfMasked: string } | null;
  deliverAfter?: boolean;
  onClose: () => void;
}) {
  const t = useT();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleStartSign() {
    setLoading(true);
    setError("");
    try {
      const url = target.kind === "prescription"
        ? "/api/professional/prescriptions/sign"
        : `/api/professional/documents/${target.id}/sign`;
      const body = target.kind === "prescription"
        ? { prescriptionId: target.id, deliverAfter: !!deliverAfter }
        : { deliverAfter: !!deliverAfter };

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.redirectUrl) {
        setError(typeof data.error === "string" ? data.error : t("digSign.modalErrStart"));
        setLoading(false);
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setError(t("digSign.modalErrNetwork"));
      setLoading(false);
    }
  }

  if (!signConfig?.configured) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <PenLine size={18} className="text-brand-500" /> {t("digSign.modalTitle")}
            </h2>
            <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            {t("digSign.modalNotConfigured")}
          </div>
          <a href="/professional/account#digital-sign" onClick={onClose}
            className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 rounded-xl text-sm transition">
            <ExternalLink size={14} /> {t("digSign.modalGoSettings")}
          </a>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-bold text-slate-900 flex items-center gap-2">
            <PenLine size={18} className="text-brand-500" /> {t("digSign.modalTitleSigned")}
          </h2>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-brand-700 flex items-center gap-2">
            <Smartphone size={15} /> {t("digSign.howTitle")}
          </p>
          <ol className="text-xs text-brand-600 space-y-1 list-decimal list-inside">
            <li>{t("digSign.modalStep1")}</li>
            <li>{t("digSign.modalStep2")}</li>
            <li>{t("digSign.modalStep3")}</li>
            <li>{t("digSign.modalStep4")}</li>
          </ol>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-sm">
          <p className="text-xs text-slate-500">{t("digSign.modalDocLabel")}</p>
          <p className="font-medium text-slate-800 text-xs">{target.label}</p>
          <p className="text-xs text-slate-400 mt-1">CPF: {signConfig.cpfMasked}</p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        <div className="flex gap-3">
          <button type="button" onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition">
            {t("digSign.modalCancel")}
          </button>
          <button type="button" onClick={handleStartSign} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-semibold text-sm transition flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={13} className="animate-spin" /> {t("digSign.modalOpening")}</> : <><Lock size={13} /> {t("digSign.modalSign")}</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export const RX_STYLES = `
  .rx-inp { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; font-size: 14px; color: #1e293b; outline: none; background: white; box-sizing: border-box; }
  .rx-inp:focus { border-color: #216a86; box-shadow: 0 0 0 3px rgba(33,106,134,.12); }
  .rx-inp.rx-inp-pl-9 { padding-left: 2.25rem; }
  .rx-inp.rx-inp-pl-10 { padding-left: 2.5rem; }
  .rx-inp.rx-inp-pr-9 { padding-right: 2.25rem; }
  .rx-inp-sm { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; font-size: 13px; color: #1e293b; outline: none; background: white; box-sizing: border-box; }
  .rx-inp-sm:focus { border-color: #216a86; box-shadow: 0 0 0 3px rgba(33,106,134,.1); }
`;
