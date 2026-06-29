"use client";

// SMS verification — enter phone, receive 6-digit code, confirm account.

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Smartphone, Loader2, AlertCircle, CheckCircle2, ArrowLeft,
} from "lucide-react";
import {
  buildVerifyAccountHref,
  buildVerifyConfirmedHref,
  resolveForgotPasswordContext,
  resolveVerifyFrom,
} from "@/lib/auth-portals";
import { useLoginLang, getLoginAccentStyles, LoginSuspenseFallback } from "@/components/auth/login-shared";
import { ForgotPasswordLayout } from "@/components/auth/forgot-password-shared";

function VerifySmsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";
  const callbackUrl = searchParams.get("callbackUrl") || "";
  const fromParam = searchParams.get("from") || "";
  const loginFrom = resolveVerifyFrom({ from: fromParam, callbackUrl });
  const { loginPath, accent } = resolveForgotPasswordContext(loginFrom);
  const styles = getLoginAccentStyles(accent);
  const { t } = useLoginLang();

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const backHref = buildVerifyAccountHref({
    email,
    callbackUrl: callbackUrl || undefined,
    from: loginPath,
  });

  async function handleSendCode() {
    if (!email || !phone.trim() || countdown > 0) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/send-sms-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      const data = await res.json();

      if (res.ok) {
        setCodeSent(true);
        setCountdown(60);
        return;
      }

      if (data.error === "RATE_LIMITED") {
        setError("rateLimited");
      } else if (data.error === "INVALID_PHONE") {
        setError("invalidPhone");
      } else if (data.error === "SMS_UNAVAILABLE") {
        setError("unavailable");
      } else if (data.error === "TRIAL_UNVERIFIED") {
        setError("trialUnverified");
      } else if (data.error === "GEO_BLOCKED") {
        setError("geoBlocked");
      } else if (data.error === "FRAUD_BLOCKED") {
        setError("fraudBlocked");
      } else if (data.error === "SNS_SANDBOX") {
        setError("snsSandbox");
      } else {
        setError("sendFailed");
      }
    } catch {
      setError("sendFailed");
    } finally {
      setLoading(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!email || code.length < 6) return;
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/verify-sms-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json();

      if (res.ok) {
        router.push(buildVerifyConfirmedHref(loginPath));
        return;
      }

      if (data.error === "EXPIRED") setError("expired");
      else if (data.error === "TOO_MANY_ATTEMPTS") setError("tooMany");
      else setError("invalidCode");
    } catch {
      setError("verifyFailed");
    } finally {
      setLoading(false);
    }
  }

  if (!email) {
    return (
      <ForgotPasswordLayout accent={accent}>
        <p className="text-slate-400 text-sm text-center">
          <Link href="/register" className={`${styles.link} underline`}>
            {t("verifySms.backRegister")}
          </Link>
        </p>
      </ForgotPasswordLayout>
    );
  }

  return (
    <ForgotPasswordLayout accent={accent}>
      <Link
        href={backHref}
        className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        {t("verifySms.back")}
      </Link>

      <div className="w-16 h-16 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-5">
        <Smartphone className="w-8 h-8 text-blue-400" aria-hidden />
      </div>

      <h2 className="text-xl font-bold text-white text-center mb-2">{t("verifySms.title")}</h2>
      <p className="text-slate-400 text-sm text-center mb-6">{t("verifySms.subtitle")}</p>

      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4" role="alert">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 shrink-0" aria-hidden />
          <p className="text-red-300 text-sm">{t(`verifySms.error.${error}`)}</p>
        </div>
      )}

      {!codeSent ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t("verifySms.phoneLabel")}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("verifySms.phonePlaceholder")}
              className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 ${styles.ring}`}
            />
            <p className="text-slate-500 text-xs mt-2">{t("verifySms.phoneHint")}</p>
          </div>
          <button
            type="button"
            onClick={handleSendCode}
            disabled={loading || !phone.trim() || countdown > 0}
            className={`w-full ${styles.btn} disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            {countdown > 0
              ? t("verifySms.resendIn").replace("{{s}}", String(countdown))
              : t("verifySms.sendCode")}
          </button>
        </div>
      ) : (
        <form onSubmit={handleVerify} className="space-y-4">
          <div className={`flex items-center gap-2 border rounded-xl p-3 mb-2 ${styles.softBg}`}>
            <CheckCircle2 className={`w-4 h-4 ${styles.softText} shrink-0`} aria-hidden />
            <p className={`${styles.softTextMuted} text-sm`}>{t("verifySms.codeSent")}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t("verifySms.codeLabel")}
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.3em] font-mono focus:outline-none focus:ring-2 ${styles.ring}`}
            />
          </div>
          <button
            type="submit"
            disabled={loading || code.length < 6}
            className={`w-full ${styles.btn} disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2`}
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
            {t("verifySms.confirm")}
          </button>
          <button
            type="button"
            onClick={handleSendCode}
            disabled={loading || countdown > 0}
            className="w-full text-slate-400 hover:text-white text-sm transition"
          >
            {countdown > 0
              ? t("verifySms.resendIn").replace("{{s}}", String(countdown))
              : t("verifySms.resend")}
          </button>
        </form>
      )}
    </ForgotPasswordLayout>
  );
}

export default function VerifySmsPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback />}>
      <VerifySmsContent />
    </Suspense>
  );
}
