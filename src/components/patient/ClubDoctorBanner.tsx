"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Loader2, X, AlertCircle, Sparkles } from "lucide-react";
import {
  CLUB_BILLING_REGION_OPTIONS,
  parseBillingRegion,
  regionsMismatch,
  billingRegionLabel,
  patientRegionMismatchMessage,
  PATIENT_ACCOUNT_PATH,
  type BillingRegion,
} from "@/lib/billing-regions";

const DISMISS_KEY = "doctor8-club-banner-dismissed";

type Props = {
  subscribed: boolean;
  defaultRegion?: string;
};

export default function ClubDoctorBanner({ subscribed, defaultRegion }: Props) {
  const profileRegion = parseBillingRegion(defaultRegion, "US");

  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISS_KEY) === "1";
  });
  const [region, setRegion] = useState<BillingRegion>(profileRegion);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  if (subscribed || dismissed) return null;

  const selected = CLUB_BILLING_REGION_OPTIONS.find((o) => o.region === region)!;
  const regionMismatch = regionsMismatch(profileRegion, region);

  async function goToCheckout() {
    if (regionMismatch) {
      setMsg(patientRegionMismatchMessage());
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/payments/subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region }),
      });
      let data: { checkoutUrl?: string; error?: string } = {};
      try {
        data = await res.json();
      } catch {
        setMsg("Resposta invalida do servidor. Tente novamente.");
        return;
      }
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
      else setMsg(data.error || "Nao foi possivel iniciar o checkout.");
    } catch {
      setMsg("Erro de conexao. Verifique sua internet e tente novamente.");
    } finally {
      setLoading(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="relative bg-gradient-to-r from-emerald-50/80 to-teal-50/60 border border-emerald-200/80 rounded-2xl p-5 sm:p-6">
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1"
        aria-label="Fechar"
      >
        <X size={16} />
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start gap-4 pr-6">
        <div className="w-10 h-10 rounded-xl bg-white border border-emerald-200 flex items-center justify-center shrink-0">
          <Heart size={18} className="text-emerald-600" />
        </div>

        <div className="flex-1 space-y-3 min-w-0">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Gostaria de fazer parte do Club Doctor?
            </p>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              E opcional e sem funcoes obrigatorias extras ? uma forma leve de apoiar a Doctor8
              e acumular carimbos para mensalidades gratis. Sem pressao: entre quando fizer sentido.
            </p>
          </div>

          {msg && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{msg}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap">
            <div className="min-w-[200px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Moeda de cobranca
              </label>
              <select
                value={region}
                onChange={(e) => {
                  setRegion(parseBillingRegion(e.target.value, region));
                  setMsg("");
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/30"
              >
                {CLUB_BILLING_REGION_OPTIONS.map((opt) => (
                  <option key={opt.region} value={opt.region}>
                    {opt.labelPt} ? {opt.priceHint}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                Regiao da conta: {billingRegionLabel(profileRegion)}
              </p>
              {regionMismatch && (
                <p className="text-xs text-amber-700 mt-1">
                  Altere em{" "}
                  <Link href={PATIENT_ACCOUNT_PATH} className="underline font-medium">
                    Conta
                  </Link>{" "}
                  para cobrar em {billingRegionLabel(region)}.
                </p>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={goToCheckout}
                disabled={loading || regionMismatch}
                className="inline-flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                Conhecer o Club Doctor
              </button>
              <Link
                href="/patient/club-doctor"
                className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2.5"
              >
                Ver detalhes
              </Link>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            A partir de {selected.priceHint.replace("/mes", "")} por mes.
          </p>
        </div>
      </div>
    </div>
  );
}
