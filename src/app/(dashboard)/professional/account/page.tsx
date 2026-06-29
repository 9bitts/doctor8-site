"use client";

// src/app/(dashboard)/professional/account/page.tsx
// Account settings for professionals (credentials, billing, digital signature).

import { useState, useEffect, useRef } from "react";
import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { resolveLoginPathForSession } from "@/lib/auth-portals";
import { localeOf } from "@/lib/i18n/translations";
import DigitalSignSettings from "@/components/professional/DigitalSignSettings";
import PushNotificationSettings from "@/components/PushNotificationSettings";
import { readApiJson, apiErrorMessage } from "@/lib/api-client";
import {
  BILLING_REGION_OPTIONS,
  parseBillingRegion,
  regionsMismatch,
  billingRegionLabel,
  SETTINGS_PROFILE_PATH,
  type BillingRegion,
} from "@/lib/billing-regions";
import { mapProfessionalPathToPortal } from "@/lib/psychologist-portal";
import {
  Lock, Mail, CheckCircle2, AlertCircle, Loader2,
  Eye, EyeOff, LogOut, Shield, CreditCard,
} from "lucide-react";

const inputClass =
  "w-full border border-slate-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500/40 focus:border-brand-400 transition";

function formatPriceHint(priceHint: string, perMonth: string): string {
  return priceHint.replace("/mês", perMonth).replace("/mes", perMonth);
}

// ── Main page ─────────────────────────────────────────────────────────────────
export default function ProfessionalAccountPage() {
  const { lang, t } = useI18n();
  const pathname = usePathname();
  const { data: session } = useSession();
  const signOutHref = resolveLoginPathForSession(
    session?.user?.role,
    pathname,
    pathname.startsWith("/psychologist"),
  );
  const settingsProfilePath = mapProfessionalPathToPortal(pathname, SETTINGS_PROFILE_PATH);
  const locale = localeOf(lang);

  const PASSWORD_RULES = [
    { key: "acct.rule8",      test: (p: string) => p.length >= 8 },
    { key: "acct.ruleUpper",  test: (p: string) => /[A-Z]/.test(p) },
    { key: "acct.ruleNumber", test: (p: string) => /[0-9]/.test(p) },
    { key: "acct.ruleSpecial",test: (p: string) => /[^A-Za-z0-9]/.test(p) },
  ];

  const [currentEmail,  setCurrentEmail]  = useState("");
  const [currentPwd,    setCurrentPwd]    = useState("");
  const [newPwd,        setNewPwd]        = useState("");
  const [confirmPwd,    setConfirmPwd]    = useState("");
  const [showCurrent,   setShowCurrent]   = useState(false);
  const [showNew,       setShowNew]       = useState(false);
  const [pwdLoading,    setPwdLoading]    = useState(false);
  const [pwdSuccess,    setPwdSuccess]    = useState(false);
  const [pwdError,      setPwdError]      = useState("");
  const [newEmail,      setNewEmail]      = useState("");
  const [emailPwd,      setEmailPwd]      = useState("");
  const [showEmailPwd,  setShowEmailPwd]  = useState(false);
  const [emailLoading,  setEmailLoading]  = useState(false);
  const [emailSuccess,  setEmailSuccess]  = useState(false);
  const [emailError,    setEmailError]    = useState("");
  const [sub, setSub] = useState<{ status: string; currentPeriodEnd?: string | null; cancelAtPeriodEnd?: boolean } | null>(null);
  const [subLoading, setSubLoading] = useState(true);
  const [subWorking, setSubWorking] = useState(false);
  const [subMsg, setSubMsg] = useState("");
  const [subMsgTone, setSubMsgTone] = useState<"success" | "error" | "warning">("success");
  const [billingRegion, setBillingRegion] = useState<BillingRegion>("BR");
  const [profileRegion, setProfileRegion] = useState<BillingRegion>("US");
  const pendingCheckout = useRef(false);

  const isPasswordValid = PASSWORD_RULES.every((r) => r.test(newPwd));
  const passwordsMatch  = newPwd === confirmPwd;
  const isSubActive = sub && ["active", "trialing"].includes(sub.status);
  const regionMismatch = regionsMismatch(profileRegion, billingRegion);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((s) => { if (s?.user?.email) setCurrentEmail(s.user.email); });
    fetch("/api/payments/professional-subscription")
      .then((r) => r.json())
      .then((d) => setSub(d.subscription || null))
      .catch(() => setSub(null))
      .finally(() => setSubLoading(false));
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

    const params = new URLSearchParams(window.location.search);
    const accountPath = mapProfessionalPathToPortal(pathname, "/professional/account");
    if (params.get("subscribed") === "true") {
      setSubMsgTone("success");
      setSubMsg(t("proConn.account.subSuccess"));
      window.history.replaceState({}, "", accountPath);
    } else if (params.get("subscribe") === "doctor-connection") {
      pendingCheckout.current = true;
      window.history.replaceState({}, "", accountPath);
    }
  }, []);

  useEffect(() => {
    if (!pendingCheckout.current || subLoading) return;
    pendingCheckout.current = false;
    void startSubscription();
  }, [subLoading, billingRegion]);

  async function handleChangePassword(e: React.FormEvent) {
    e.preventDefault();
    setPwdError(""); setPwdSuccess(false);
    if (!isPasswordValid) { setPwdError(t("acct.errPwdReq")); return; }
    if (!passwordsMatch)  { setPwdError(t("acct.pwdNoMatch")); return; }
    setPwdLoading(true);
    try {
      const res  = await fetch("/api/auth/change-password", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ currentPassword: currentPwd, newPassword: newPwd }),
      });
      const data = await res.json();
      if (!res.ok) { setPwdError(typeof data.error === "string" ? data.error : t("acct.errPwdFail")); return; }
      setPwdSuccess(true); setCurrentPwd(""); setNewPwd(""); setConfirmPwd("");
      setTimeout(() => setPwdSuccess(false), 5000);
    } catch { setPwdError(t("acct.errGeneric")); }
    finally { setPwdLoading(false); }
  }

  async function handleChangeEmail(e: React.FormEvent) {
    e.preventDefault();
    setEmailError(""); setEmailSuccess(false);
    if (!newEmail) { setEmailError(t("acct.errEnterEmail")); return; }
    setEmailLoading(true);
    try {
      const res  = await fetch("/api/auth/change-email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body:   JSON.stringify({ newEmail, currentPassword: emailPwd }),
      });
      const data = await res.json();
      if (!res.ok) { setEmailError(typeof data.error === "string" ? data.error : t("acct.errEmailFail")); return; }
      setEmailSuccess(true); setNewEmail(""); setEmailPwd("");
    } catch { setEmailError(t("acct.errGeneric")); }
    finally { setEmailLoading(false); }
  }

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
      setSubMsg(apiErrorMessage(parsed, t("billing.err.checkout"), {
        server: t("billing.err.server"),
        invalid: t("billing.err.invalid"),
      }));
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
        const refreshed = await fetch("/api/payments/professional-subscription").then((r) => r.json());
        setSub(refreshed.subscription || null);
      } else {
        setSubMsg(d.error || t("billing.cancelFail"));
      }
    } catch {
      setSubMsg(t("billing.err.connection"));
    } finally {
      setSubWorking(false);
    }
  }

  return (
    <div className="max-w-2xl mx-auto space-y-6 pb-10">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("acct.title")}</h1>
        <p className="text-slate-500 mt-1 text-sm">{t("acct.subtitle")}</p>
      </div>

      {/* Email atual */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center gap-4">
        <div className="w-10 h-10 rounded-xl bg-brand-100 flex items-center justify-center">
          <Shield size={18} className="text-brand-500" />
        </div>
        <div>
          <p className="text-sm font-semibold text-slate-800">{currentEmail || t("common.loading")}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t("acct.currentEmail")}</p>
        </div>
      </div>

      <DigitalSignSettings />

      {/* Mensalidade profissional */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-4">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <CreditCard size={18} className="text-brand-500" /> {t("proConn.account.title")}
        </h2>
        <p className="text-sm text-slate-500">{t("proConn.account.desc")}</p>
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
          {t("billing.accountRegionLabel")} <strong>{billingRegionLabel(profileRegion)}</strong>
          {profileRegion !== billingRegion && (
            <>
              {" "}
              {t("billing.changeCurrencyIn")}{" "}
              <Link href={settingsProfilePath} className="text-brand-600 underline font-medium">
                {t("billing.changeInProfile")}
              </Link>
              .
            </>
          )}
        </p>
        {subLoading ? (
          <div className="flex items-center gap-2 text-sm text-slate-500">
            <Loader2 size={16} className="animate-spin" /> {t("common.loading")}
          </div>
        ) : isSubActive ? (
          <div className="space-y-3">
            <p className="text-sm text-emerald-700 font-medium">{t("proConn.account.active")}</p>
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
                  <Link
                    href={settingsProfilePath}
                    className="inline-flex font-semibold text-amber-900 underline"
                  >
                    {t("billing.openProfileChange")}
                  </Link>
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

      {/* Alterar senha */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Lock size={18} className="text-brand-500" /> {t("acct.changePassword")}
        </h2>
        {pwdSuccess && (
          <div className="flex items-center gap-2 bg-brand-50 border border-brand-200 rounded-xl p-3 text-sm text-brand-600">
            <CheckCircle2 size={16} /> {t("acct.pwdSuccess")}
          </div>
        )}
        {pwdError && (
          <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
            <AlertCircle size={16} /> {pwdError}
          </div>
        )}
        <form onSubmit={handleChangePassword} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("acct.currentPwd")}</label>
            <div className="relative">
              <input type={showCurrent ? "text" : "password"} value={currentPwd} onChange={(e) => setCurrentPwd(e.target.value)} required className={inputClass + " pr-12"} />
              <button type="button" onClick={() => setShowCurrent(!showCurrent)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showCurrent ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("acct.newPwd")}</label>
            <div className="relative">
              <input type={showNew ? "text" : "password"} value={newPwd} onChange={(e) => setNewPwd(e.target.value)} required className={inputClass + " pr-12"} />
              <button type="button" onClick={() => setShowNew(!showNew)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                {showNew ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
            {newPwd && (
              <div className="mt-2 space-y-1">
                {PASSWORD_RULES.map((rule) => (
                  <div key={rule.key} className="flex items-center gap-2">
                    <CheckCircle2 size={12} className={rule.test(newPwd) ? "text-brand-500" : "text-slate-300"} />
                    <span className={`text-xs ${rule.test(newPwd) ? "text-brand-500" : "text-slate-400"}`}>{t(rule.key)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("acct.confirmPwd")}</label>
            <input type="password" value={confirmPwd} onChange={(e) => setConfirmPwd(e.target.value)} required className={inputClass} />
            {confirmPwd && !passwordsMatch && <p className="text-xs text-red-500 mt-1">{t("acct.pwdNoMatch")}</p>}
          </div>
          <button type="submit" disabled={pwdLoading || !isPasswordValid || !passwordsMatch || !currentPwd}
            className="bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm flex items-center gap-2">
            {pwdLoading && <Loader2 size={15} className="animate-spin" />}
            {pwdLoading ? t("acct.saving") : t("acct.changePasswordBtn")}
          </button>
        </form>
      </div>

      {/* Alterar email */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <h2 className="font-semibold text-slate-800 flex items-center gap-2">
          <Mail size={18} className="text-brand-500" /> {t("acct.changeEmail")}
        </h2>
        {emailSuccess ? (
          <div className="flex items-start gap-3 bg-brand-50 border border-brand-200 rounded-xl p-4">
            <CheckCircle2 size={18} className="text-brand-500 mt-0.5 shrink-0" />
            <div>
              <p className="text-sm font-semibold text-brand-600">{t("acct.emailSentTitle")}</p>
              <p className="text-xs text-brand-500 mt-1">{t("acct.emailSentText")}</p>
            </div>
          </div>
        ) : (
          <>
            {emailError && (
              <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-xl p-3 text-sm text-red-700">
                <AlertCircle size={16} /> {emailError}
              </div>
            )}
            <form onSubmit={handleChangeEmail} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("acct.newEmail")}</label>
                <input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} required className={inputClass} placeholder="new@email.com" />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-600 mb-1.5">{t("acct.confirmWithPwd")}</label>
                <div className="relative">
                  <input type={showEmailPwd ? "text" : "password"} value={emailPwd} onChange={(e) => setEmailPwd(e.target.value)} required className={inputClass + " pr-12"} />
                  <button type="button" onClick={() => setShowEmailPwd(!showEmailPwd)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                    {showEmailPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <button type="submit" disabled={emailLoading || !newEmail}
                className="bg-brand-500 hover:bg-brand-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold px-6 py-2.5 rounded-xl transition text-sm flex items-center gap-2">
                {emailLoading && <Loader2 size={15} className="animate-spin" />}
                {emailLoading ? t("acct.sending") : t("acct.sendVerification")}
              </button>
            </form>
          </>
        )}
      </div>

      <PushNotificationSettings />

      {/* Sign out */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-slate-800">{t("acct.signOut")}</p>
          <p className="text-xs text-slate-400 mt-0.5">{t("acct.signOutDesc")}</p>
        </div>
        <button onClick={() => signOut({ callbackUrl: signOutHref })}
          className="w-full sm:w-auto flex items-center justify-center gap-2 text-sm font-semibold text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 px-4 py-2.5 rounded-xl transition min-h-[44px] shrink-0">
          <LogOut size={15} /> {t("acct.signOut")}
        </button>
      </div>
    </div>
  );
}
