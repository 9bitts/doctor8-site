"use client";

import { useState } from "react";
import {
  PenLine, Smartphone, Lock, Loader2, AlertCircle, X, ExternalLink,
} from "lucide-react";

export type EmissionKind = "prescription" | "exam" | "document";

export interface SignTarget {
  kind: EmissionKind;
  id: string;
  label: string;
}

export function EmissionsSignModal({
  target,
  signConfig,
  onClose,
}: {
  target: SignTarget;
  signConfig: { configured: boolean; cpfMasked: string } | null;
  onClose: () => void;
}) {
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
        ? { prescriptionId: target.id }
        : undefined;

      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const data = await res.json();
      if (!res.ok || !data.redirectUrl) {
        setError(data.error || "Erro ao iniciar assinatura.");
        setLoading(false);
        return;
      }
      window.location.href = data.redirectUrl;
    } catch {
      setError("Erro de rede. Tente novamente.");
      setLoading(false);
    }
  }

  if (!signConfig?.configured) {
    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-bold text-slate-900 flex items-center gap-2">
              <PenLine size={18} className="text-brand-500" /> Assinatura Digital
            </h2>
            <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
          </div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-800">
            Configure o CPF da assinatura digital nas configurações da conta antes de assinar.
          </div>
          <a href="/professional/account" onClick={onClose}
            className="w-full flex items-center justify-center gap-2 bg-brand-500 hover:bg-brand-600 text-white font-semibold py-2.5 rounded-xl text-sm transition">
            <ExternalLink size={14} /> Ir para configurações
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
            <PenLine size={18} className="text-brand-500" /> Assinatura ICP-Brasil
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="bg-brand-50 border border-brand-200 rounded-xl p-4 space-y-2">
          <p className="text-sm font-semibold text-brand-700 flex items-center gap-2">
            <Smartphone size={15} /> Como funciona
          </p>
          <ol className="text-xs text-brand-600 space-y-1 list-decimal list-inside">
            <li>Você será levado à página segura de assinatura</li>
            <li>Escolha seu certificado (BirdID, VIDaaS, etc.)</li>
            <li>Autorize no app do celular</li>
            <li>Volta automaticamente com o documento assinado</li>
          </ol>
        </div>
        <div className="bg-slate-50 rounded-xl p-3 text-sm">
          <p className="text-xs text-slate-500">Documento</p>
          <p className="font-medium text-slate-800 text-xs">{target.label}</p>
          <p className="text-xs text-slate-400 mt-1">CPF: {signConfig.cpfMasked}</p>
        </div>
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700 flex items-center gap-2">
            <AlertCircle size={14} /> {error}
          </div>
        )}
        <div className="flex gap-3">
          <button onClick={onClose}
            className="flex-1 py-2.5 rounded-xl border border-slate-200 text-slate-600 font-medium text-sm hover:bg-slate-50 transition">
            Cancelar
          </button>
          <button onClick={handleStartSign} disabled={loading}
            className="flex-1 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-600 disabled:opacity-40 text-white font-semibold text-sm transition flex items-center justify-center gap-2">
            {loading ? <><Loader2 size={13} className="animate-spin" /> Abrindo...</> : <><Lock size={13} /> Assinar</>}
          </button>
        </div>
      </div>
    </div>
  );
}

export const RX_STYLES = `
  .rx-inp { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 12px; padding: 12px 14px; font-size: 14px; color: #1e293b; outline: none; background: white; }
  .rx-inp:focus { border-color: #216a86; box-shadow: 0 0 0 3px rgba(33,106,134,.12); }
  .rx-inp-sm { width: 100%; border: 1.5px solid #e2e8f0; border-radius: 10px; padding: 8px 12px; font-size: 13px; color: #1e293b; outline: none; background: white; }
  .rx-inp-sm:focus { border-color: #216a86; box-shadow: 0 0 0 3px rgba(33,106,134,.1); }
`;
