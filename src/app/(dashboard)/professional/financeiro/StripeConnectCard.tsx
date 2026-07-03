"use client";

import { useCallback, useEffect, useState } from "react";
import {
  CreditCard, Loader2, AlertCircle, CheckCircle2, RefreshCw, ExternalLink,
} from "lucide-react";
import { useT } from "@/lib/i18n/I18nProvider";

type ConnectStatus = "none" | "onboarding_incomplete" | "pending" | "active";

interface StripeConnectCardProps {
  mode?: "full" | "unavailable";
}

export function StripeConnectCard({ mode = "full" }: StripeConnectCardProps) {
  const t = useT();
  const [status, setStatus] = useState<ConnectStatus | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const loadStatus = useCallback(async () => {
    if (mode === "unavailable") {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/professional/stripe-connect/status");
      if (res.status === 503) {
        setStatus(null);
        return;
      }
      if (!res.ok) {
        setError(t("connect.error"));
        return;
      }
      const data = await res.json();
      setStatus(data.status as ConnectStatus);
    } catch {
      setError(t("connect.error"));
    } finally {
      setLoading(false);
    }
  }, [mode, t]);

  useEffect(() => {
    void loadStatus();
  }, [loadStatus]);

  async function handleOnboard() {
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/professional/stripe-connect/onboard", { method: "POST" });
      if (!res.ok) {
        setError(t("connect.error"));
        return;
      }
      const data = await res.json();
      if (data.url) window.location.href = data.url;
    } catch {
      setError(t("connect.error"));
    } finally {
      setSubmitting(false);
    }
  }

  if (mode === "unavailable") {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center shrink-0">
            <CreditCard size={18} className="text-slate-500" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 text-sm">{t("connect.title")}</h3>
            <p className="text-xs text-slate-500 mt-1">{t("connect.unavailableDesc")}</p>
          </div>
        </div>
      </div>
    );
  }

  const statusLabel = status ? t(`connect.status.${status}`) : "";
  const showCta = status === "none" || status === "onboarding_incomplete" || status === "pending";
  const ctaLabel =
    status === "none" ? t("connect.cta.connect") : t("connect.cta.resume");

  return (
    <div className="rounded-2xl border border-slate-200 bg-white shadow-sm p-5">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-brand-50 flex items-center justify-center shrink-0">
            <CreditCard size={18} className="text-brand-500" />
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-slate-900 text-sm">{t("connect.title")}</h3>
            <p className="text-xs text-slate-500 mt-0.5">{t("connect.subtitle")}</p>
            {loading ? (
              <p className="text-xs text-slate-400 mt-2 flex items-center gap-1">
                <Loader2 size={12} className="animate-spin" /> {t("connect.loading")}
              </p>
            ) : status === "active" ? (
              <span className="connect-badge-active inline-flex items-center gap-1 mt-2 text-xs font-semibold px-2 py-0.5 rounded-full bg-brand-100 text-brand-700">
                <CheckCircle2 size={12} /> {t("connect.badge.active")}
              </span>
            ) : status ? (
              <p className="text-xs text-amber-700 mt-2 font-medium">{statusLabel}</p>
            ) : null}
          </div>
        </div>

        {!loading && showCta && (
          <button
            type="button"
            onClick={() => void handleOnboard()}
            disabled={submitting}
            className="connect-cta-btn inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-500 text-white text-sm font-semibold hover:bg-brand-600 disabled:opacity-60 transition shrink-0"
          >
            {submitting ? (
              <Loader2 size={14} className="animate-spin" />
            ) : (
              <ExternalLink size={14} />
            )}
            {ctaLabel}
          </button>
        )}
      </div>

      {error && (
        <div className="mt-3 flex items-center gap-2 text-xs text-rose-700">
          <AlertCircle size={14} className="shrink-0" />
          <span className="flex-1">{error}</span>
          <button
            type="button"
            onClick={() => void loadStatus()}
            className="font-semibold flex items-center gap-1 hover:underline shrink-0"
          >
            <RefreshCw size={12} /> {t("common.retry")}
          </button>
        </div>
      )}
    </div>
  );
}
