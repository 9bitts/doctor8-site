"use client";

import { useState } from "react";
import Link from "next/link";
import { Heart, Loader2, X } from "lucide-react";
import {
  BILLING_REGION_OPTIONS,
  parseBillingRegion,
  type BillingRegion,
} from "@/lib/billing-regions";

const DISMISS_KEY = "doctor8-support-banner-dismissed";

type Props = {
  subscribed: boolean;
  defaultRegion?: string;
};

export default function DoctorConnectionBanner({ subscribed, defaultRegion }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false;
    return localStorage.getItem(DISMISS_KEY) === "1";
  });
  const [region, setRegion] = useState<BillingRegion>(
    parseBillingRegion(defaultRegion, "BR"),
  );
  const [loading, setLoading] = useState(false);

  if (subscribed || dismissed) return null;

  const selected = BILLING_REGION_OPTIONS.find((o) => o.region === region)!;

  async function goToCheckout() {
    setLoading(true);
    try {
      const res = await fetch("/api/payments/professional-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region }),
      });
      const data = await res.json();
      if (data.checkoutUrl) window.location.href = data.checkoutUrl;
    } finally {
      setLoading(false);
    }
  }

  function dismiss() {
    localStorage.setItem(DISMISS_KEY, "1");
    setDismissed(true);
  }

  return (
    <div className="relative bg-gradient-to-r from-slate-50 to-brand-50/60 border border-slate-200 rounded-2xl p-5 sm:p-6">
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1"
        aria-label="Fechar"
      >
        <X size={16} />
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start gap-4 pr-6">
        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
          <Heart size={18} className="text-brand-500" />
        </div>

        <div className="flex-1 space-y-3 min-w-0">
          <div>
            <p className="text-sm font-semibold text-slate-800">
              Gostaria de apoiar a Doctor8?
            </p>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">
              O Doctor Connection nao libera funcoes extras ? e apenas uma forma opcional de
              ajudar a plataforma a seguir evoluindo. Sem pressao: assine quando fizer sentido
              para voce.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap">
            <div className="min-w-[200px]">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                Moeda de cobranca
              </label>
              <select
                value={region}
                onChange={(e) => setRegion(parseBillingRegion(e.target.value, region))}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                {BILLING_REGION_OPTIONS.map((opt) => (
                  <option key={opt.region} value={opt.region}>
                    {opt.labelPt} ? {opt.priceHint}
                  </option>
                ))}
              </select>
              {region === "BR" && (
                <p className="text-xs text-slate-500 mt-1">Cartao, PIX ou boleto no checkout.</p>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={goToCheckout}
                disabled={loading}
                className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                Apoiar com Doctor Connection
              </button>
              <Link
                href="/professional/account"
                className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2.5"
              >
                Ver detalhes
              </Link>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            Valor em {selected.currency}: {selected.priceHint.replace("/mes", "")} por mes.
          </p>
        </div>
      </div>
    </div>
  );
}
