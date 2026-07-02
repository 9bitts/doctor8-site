"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { localeOf } from "@/lib/i18n/translations";
import { readApiJson, apiErrorMessage } from "@/lib/api-client";
import {
  BILLING_REGION_OPTIONS,
  parseBillingRegion,
  regionsMismatch,
  billingRegionLabel,
  type BillingRegion,
} from "@/lib/billing-regions";
import { CreditCard, Loader2, CheckCircle2, AlertCircle } from "lucide-react";

function formatPriceHint(priceHint: string, perMonth: string): string {
  return priceHint.replace("/m?s", perMonth).replace("/mes", perMonth);
}

export type DoctorConnectionSettingsProps = {
  embedded?: boolean;
  profileRegion?: BillingRegion;
  onSubscribed?: () => void;
};

export default function DoctorConnectionSettings({
  embedded = false,
  profileRegion: profileRegionProp,
  onSubscribed,
}: DoctorConnectionSettingsProps) {
  const { lang, t } = useI18n();
  const locale = localeOf(lang);

  const [sub, setSub] = useState<{
    status: string;
    currentPeriodEnd?: string | null;
    cancelAtPeriodEnd?: boolean;
  } | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [subWorking, setSubWorking] = useState(false);
  const [subMsg, setSubMsg] = useState("");
  const [subMsgTone, setSubMsgTone] = useState<"success" | "error" | "warning">("success");
  const [profileRegion, setProfileRegion] = useState<BillingRegion>(profileRegionProp ?? "US");
  const [billingRegion, setBillingRegion] = useState<BillingRegion>(profileRegionProp ?? "US");

  const isSubActive = sub && ["active", "trialing"].includes(sub.status);
  const regionMismatch = regionsMismatch(profileRegion, billingRegion);

  useEffect(() => {
    fetch("/api/payments/professional-subscription")
      .then((r) => r.json())
      .then((d) => setSub(d.subscription || null))
      .catch(() => setSub(null))
      .finally(() => setSubLoading(false));

    if (!profileRegionProp) {
      fetch("/api/user/region")
        .then((r) => r.json())
        .then((d) => {
          if (d?.region) {
            const region = parseBillingRegion(d.region, "US");
            setProfileRegion(region);
            setBillingRegion(region);
          }
        })
        .catch(() => {});
    }
  }, [profileRegionProp]);

  useEffect(() => {
    if (profileRegionProp) {
      setProfileRegion(profileRegionProp);
      setBillingRegion(profileRegionProp);
    }
  }, [profileRegionProp]);

  async function startSubscription() {
    if (regionMismatch) {
      setSubMsgTone("warning");
      setSubMsg(t("billing.regionMismatch"));
      return;
    }
    setSubWorking(true);
    setSubMsg("");
    try {
      const res = await fetch("/api/payments/professional-subscription", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ region: billingRegion }),
      });
      const parsed = await readApiJson<{ checkoutUrl?: string; error?: string; code?: string }>(res);
      if (parsed.data?.checkoutUrl) {
        window.location.href = parsed.data.checkoutUrl;
        return;
      }
      setSubMsgTone(parsed.data?.code === "REGION_MISMATCH" ? "warning" : "error");
      setSubMsg(
        apiErrorMessage(parsed, t("billing.err.checkout"), {
          server: t("billing.err.server"),
          invalid: t("billing.err.invalid"),
        }),
      );
    } catch {
      setSubMsgTone("error");
      setSubMsg(t("billing.err.connection"));
    } finally {
      setSubWorking(false);
    }
  }

  async function cancelSubscription() {
    if (!confirm(t("billing.cancelConfirm"))) return;
    setSubWorking(true);
    setSubMsg("");
    try {
      const res = await fetch("/api/payments/professional-subscription", { method: "DELETE" });
      const d = await res.json();
      if (res.ok) {
        setSubMsg(t("billing.cancelScheduled"));
        const refreshed = await fetch("/api/payments/professional-subscription").then((r) =>
          r.json(),
        );
        setSub(refreshed.subscription || null);
        onSubscribed?.();
      } else {
        setSubMsg(d.error || t("billing.cancelFail"));
      }
    } catch {
      setSubMsg(t("billing.err.connection"));
    } finally {
      setSubWorking(false);
    }
  }

  const content = (
    <div className="space-y-4">
      {!embedded && (
        <>
          <h2 className="font-semibold text-slate-800 flex items-center gap-2">
            <CreditCard size={18} className="text-brand-500" /> {t("proConn.account.title")}
          </h2>
          <p className="text-sm text-slate-500">{t("proConn.account.desc")}</p>
        </>
      )}
      {embedded && <p className="text-sm text-slate-500">{t("proConn.account.desc")}</p>}

      {subMsg && (
        <div
          className={`flex items-start gap-2 rounded-xl p-3 text-sm ${
            subMsgTone === "success"
              ? "bg-brand-50 border border-brand-200 text-brand-700"
              : subMsgTone === "warning"
                ? "bg-amber-50 border border-amber-200 text-amber-800"
                : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          {subMsgTone === "success" ? (
            <CheckCircle2 size={16} className="shrink-0 mt-0.5" />
          ) : (
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
          )}
          <span>{subMsg}</span>
        </div>
      )}

      <p className="text-xs text-slate-500">
        {t("billing.accountRegionLabel")}{" "}
        <strong>{billingRegionLabel(profileRegion)}</strong>
      </p>

      {subLoading ? (
        <div className="flex items-center gap-2 text-sm text-slate-500">
          <Loader2 size={16} className="animate-spin" /> {t("common.loading")}
        </div>
      ) : isSubActive ? (
        <div className="space-y-3">
          <p className="text-sm text-emerald-700 font-medium flex items-center gap-2">
            <CheckCircle2 size={16} /> {t("proConn.account.active")}
          </p>
          {sub?.currentPeriodEnd && (
            <p className="text-xs text-slate-500">
              {t("proConn.account.periodEnd").replace(
                "{{date}}",
                new Date(sub.currentPeriodEnd).toLocaleDateString(locale),
              )}
              {sub.cancelAtPeriodEnd ? ` ${t("proConn.account.cancelPending")}` : ""}
            </p>
          )}
          {!sub?.cancelAtPeriodEnd && (
            <button
              type="button"
              onClick={cancelSubscription}
              disabled={subWorking}
              className="text-sm font-semibold text-red-600 hover:text-red-700"
            >
              {subWorking ? t("acct.saving") : t("proConn.account.cancelBtn")}
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-500 mb-1.5">
              {t("billing.currency")}
            </label>
            <select
              value={billingRegion}
              onChange={(e) => setBillingRegion(parseBillingRegion(e.target.value, billingRegion))}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/30"
            >
              {BILLING_REGION_OPTIONS.map((opt) => (
                <option key={opt.region} value={opt.region}>
                  {t("billing.currencyOption")
                    .replace("{{label}}", opt.labelPt)
                    .replace("{{price}}", formatPriceHint(opt.priceHint, t("billing.perMonth")))}
                </option>
              ))}
            </select>
            {billingRegion === "BR" && !regionMismatch && (
              <p className="text-xs text-slate-500 mt-1.5">{t("billing.checkoutBr")}</p>
            )}
            {regionMismatch && (
              <div className="mt-2 bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-800 space-y-2">
                <p>{t("billing.regionMismatch")}</p>
                <p>
                  {t("billing.regionMismatchDetail")
                    .replace("{{profile}}", billingRegionLabel(profileRegion))
                    .replace("{{selected}}", billingRegionLabel(billingRegion))}
                </p>
                <p className="font-medium">{t("set.sectionRegionHint")}</p>
              </div>
            )}
          </div>
          <button
            type="button"
            onClick={startSubscription}
            disabled={subWorking || regionMismatch}
            className="bg-brand-500 hover:bg-brand-400 disabled:opacity-40 text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm flex items-center gap-2"
          >
            {subWorking && <Loader2 size={15} className="animate-spin" />}
            {t("proConn.account.subscribeBtn")}
          </button>
        </div>
      )}
    </div>
  );

  if (embedded) return content;

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">{content}</div>
  );
}
