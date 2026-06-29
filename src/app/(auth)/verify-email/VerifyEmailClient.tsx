"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import {
  resolveForgotPasswordContext,
  sanitizeLoginFrom,
} from "@/lib/auth-portals";
import {
  useLoginLang,
  getLoginAccentStyles,
  buildAuthHref,
} from "@/components/auth/login-shared";
import { ForgotPasswordLayout } from "@/components/auth/forgot-password-shared";

type Props = {
  email: string;
  error?: string;
  callbackUrl?: string;
  from?: string;
};

export default function VerifyEmailClient({ email, error, callbackUrl = "", from }: Props) {
  const { t } = useLoginLang();
  const loginFrom = sanitizeLoginFrom(from) ?? resolveForgotPasswordContext(from).loginPath;
  const { loginPath, accent } = resolveForgotPasswordContext(loginFrom);
  const styles = getLoginAccentStyles(accent);
  const loginHref = buildAuthHref(loginPath, { callbackUrl: callbackUrl || undefined });

  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sent" | "error">("idle");
  const [countdown, setCountdown] = useState(0);

  const isExpired = error === "expired";

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  async function handleResend() {
    if (!email || countdown > 0) return;
    setResendLoading(true);
    setResendStatus("idle");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, from: loginPath }),
      });

      if (res.ok) {
        setResendStatus("sent");
        setCountdown(60);
      } else {
        setResendStatus("error");
      }
    } catch {
      setResendStatus("error");
    } finally {
      setResendLoading(false);
    }
  }

  function resendLabel() {
    if (countdown > 0) {
      return t("verifyEmail.resendCountdown").replace("{{seconds}}", String(countdown));
    }
    if (resendStatus === "sent") return t("verifyEmail.resendAgain");
    return t("verifyEmail.resendBtn");
  }

  return (
    <ForgotPasswordLayout accent={accent}>
      <div className="text-center">
        <div className={`w-20 h-20 border rounded-full flex items-center justify-center mx-auto mb-6 ${styles.softBg}`}>
          <Mail className={`w-10 h-10 ${styles.softText}`} aria-hidden />
        </div>

        {isExpired ? (
          <>
            <h2 className="text-2xl font-bold text-white mb-3">{t("verifyEmail.expiredTitle")}</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-6">{t("verifyEmail.expiredDesc")}</p>
          </>
        ) : (
          <>
            <h2 className="text-2xl font-bold text-white mb-3">{t("verifyEmail.title")}</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-2">{t("verifyEmail.sentTo")}</p>
            {email && (
              <p className={`${styles.softText} font-semibold text-sm mb-6 break-all`}>{email}</p>
            )}
            <p className="text-slate-500 text-xs mb-6">{t("verifyEmail.hint")}</p>
          </>
        )}

        {resendStatus === "sent" && (
          <div className={`flex items-center gap-2 border rounded-xl p-3 mb-4 text-left ${styles.softBg}`}>
            <CheckCircle2 className={`w-4 h-4 ${styles.softText} shrink-0`} aria-hidden />
            <p className={`${styles.softTextMuted} text-sm`}>{t("verifyEmail.resentOk")}</p>
          </div>
        )}

        {resendStatus === "error" && (
          <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-left" role="alert">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden />
            <p className="text-red-300 text-sm">{t("verifyEmail.resentFail")}</p>
          </div>
        )}

        {email && (
          <button
            type="button"
            onClick={handleResend}
            disabled={resendLoading || countdown > 0}
            className={`w-full flex items-center justify-center gap-2 ${styles.btn} disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition mb-4`}
          >
            {resendLoading ? (
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
            ) : (
              <RefreshCw className="w-4 h-4" aria-hidden />
            )}
            {resendLabel()}
          </button>
        )}

        <div className="border-t border-white/10 pt-4">
          <p className="text-slate-500 text-xs mb-3">{t("verifyEmail.wrongEmail")}</p>
          <Link href="/register" className={`${styles.link} text-sm font-medium transition`}>
            {t("verifyEmail.backRegister")}
          </Link>
          <span className="text-slate-600 mx-3" aria-hidden>·</span>
          <Link href={loginHref} className="text-slate-400 hover:text-slate-300 text-sm transition">
            {t("verifyEmail.signIn")}
          </Link>
        </div>
      </div>
    </ForgotPasswordLayout>
  );
}
