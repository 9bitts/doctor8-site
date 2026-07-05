"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Loader2, X, AlertCircle } from "lucide-react";
import { readApiJson, apiErrorMessage } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  BILLING_REGION_OPTIONS,
  parseBillingRegion,
  regionsMismatch,
  billingRegionLabel,
  SETTINGS_PROFILE_PATH,
  type BillingRegion,
} from "@/lib/billing-regions";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";

const DISMISS_KEY = "doctor8-support-banner-dismissed";

type Props = {
  subscribed: boolean;
  defaultRegion?: string;
  accountHref?: string;
};

function formatPriceHint(priceHint: string, perMonth: string): string {
  return priceHint.replace("/mês", perMonth).replace("/mes", perMonth);
}

export default function DoctorConnectionBanner({ subscribed, defaultRegion, accountHref = "/professional/account" }: Props) {
  const { t } = useI18n();
  const pathname = usePathname();
  const settingsProfilePath = mapProfessionalPathToPortal(pathname, SETTINGS_PROFILE_PATH);
  const profileRegion = parseBillingRegion(defaultRegion, "US");

  const [dismissed, setDismissed] = useState(false);
  const [region, setRegion] = useState<BillingRegion>(profileRegion);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    try {
      if (localStorage.getItem(DISMISS_KEY) === "1") setDismissed(true);
    } catch (err) {
      console.warn("localStorage unavailable:", err);
    }
  }, []);

  if (subscribed || dismissed) return null;

  const selected = BILLING_REGION_OPTIONS.find((o) => o.region === region)!;
  const regionMismatch = regionsMismatch(profileRegion, region);
  const apiLabels = {
    server: t("billing.err.server"),
    invalid: t("billing.err.invalid"),
  };

  async function goToCheckout() {
    if (regionMismatch) {
      setMsg(t("billing.regionMismatch"));
      return;
    }
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/payments/professional-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region }),
      });
      const parsed = await readApiJson<{ checkoutUrl?: string; error?: string }>(res);
      if (parsed.data?.checkoutUrl) {
        window.location.href = parsed.data.checkoutUrl;
        return;
      }
      setMsg(apiErrorMessage(parsed, t("billing.err.checkout"), apiLabels));
    } catch {
      setMsg(t("billing.err.connection"));
    } finally {
      setLoading(false);
    }
  }

  function dismiss() {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch (err) {
      console.warn("localStorage unavailable:", err);
    }
    setDismissed(true);
  }

  return (
    <div className="relative bg-gradient-to-r from-slate-50 to-brand-50/60 border border-slate-200 rounded-2xl p-5 sm:p-6">
      <button
        type="button"
        onClick={dismiss}
        className="absolute top-3 right-3 text-slate-400 hover:text-slate-600 p-1"
        aria-label={t("proConn.banner.close")}
      >
        <X size={16} />
      </button>

      <div className="flex flex-col sm:flex-row sm:items-start gap-4 pr-6">
        <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center shrink-0">
          <Heart size={18} className="text-brand-500" />
        </div>

        <div className="flex-1 space-y-3 min-w-0">
          <div>
            <p className="text-sm font-semibold text-slate-800">{t("proConn.banner.title")}</p>
            <p className="text-sm text-slate-600 mt-1 leading-relaxed">{t("proConn.banner.desc")}</p>
          </div>

          {msg && (
            <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800">
              <AlertCircle size={14} className="shrink-0 mt-0.5" />
              <span>{msg}</span>
            </div>
          )}

          <div className="flex flex-col sm:flex-row sm:items-end gap-3 flex-wrap">
            <div className="w-full sm:min-w-[200px] sm:flex-1">
              <label className="block text-xs font-medium text-slate-500 mb-1">
                {t("billing.currency")}
              </label>
              <select
                value={region}
                onChange={(e) => {
                  setRegion(parseBillingRegion(e.target.value, region));
                  setMsg("");
                }}
                className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-500/30"
              >
                {BILLING_REGION_OPTIONS.map((opt) => (
                  <option key={opt.region} value={opt.region}>
                    {t("billing.currencyOption")
                      .replace("{{label}}", opt.labelPt)
                      .replace("{{price}}", formatPriceHint(opt.priceHint, t("billing.perMonth")))}
                  </option>
                ))}
              </select>
              <p className="text-xs text-slate-500 mt-1">
                {t("billing.accountRegion").replace("{{region}}", billingRegionLabel(profileRegion))}
              </p>
              {regionMismatch && (
                <p className="text-xs text-amber-700 mt-1">
                  {t("billing.chargeInBefore")}{" "}
                  <Link href={settingsProfilePath} className="underline font-medium">
                    {t("billing.changeInProfile")}
                  </Link>{" "}
                  {t("billing.chargeInAfter").replace("{{region}}", billingRegionLabel(region))}
                </p>
              )}
              {region === "BR" && !regionMismatch && (
                <p className="text-xs text-slate-500 mt-1">{t("billing.checkoutBr")}</p>
              )}
            </div>

            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={goToCheckout}
                disabled={loading || regionMismatch}
                className="inline-flex items-center gap-2 bg-brand-500 hover:bg-brand-400 disabled:opacity-50 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition"
              >
                {loading && <Loader2 size={14} className="animate-spin" />}
                {t("proConn.banner.cta")}
              </button>
              <Link
                href={accountHref}
                className="inline-flex items-center text-sm font-medium text-slate-600 hover:text-slate-900 px-3 py-2.5"
              >
                {t("club.banner.details")}
              </Link>
            </div>
          </div>

          <p className="text-xs text-slate-400">
            {t("proConn.banner.priceIn")
              .replace("{{price}}", formatPriceHint(selected.priceHint, t("billing.perMonth")))
              .replace("{{currency}}", selected.currency)}
          </p>
        </div>
      </div>
    </div>
  );
}
