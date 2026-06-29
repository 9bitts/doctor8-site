"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, ArrowLeft } from "lucide-react";
import { Lang, translate } from "@/lib/i18n/translations";
import type { LoginAccent } from "@/lib/auth-portals";
import { getLoginAccentStyles } from "@/components/auth/login-shared";

export function SendResetEmailButton({
  email,
  lang,
  accent,
  loginHref,
}: {
  email: string;
  lang: Lang;
  accent: LoginAccent;
  loginHref: string;
}) {
  const t = (key: string) => translate(lang, key);
  const styles = getLoginAccentStyles(accent);
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) setSent(true);
      else setError(t("forgot.error"));
    } catch {
      setError(t("forgot.error"));
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <div className={`${styles.softBg} border rounded-xl p-4`}>
        <div className="flex items-start gap-3">
          <CheckCircle2 className={`w-5 h-5 ${styles.softText} shrink-0 mt-0.5`} aria-hidden />
          <div>
            <p className={`${styles.softTextMuted} text-sm font-medium`}>{t("forgot.emailSentTitle")}</p>
            <p className="text-slate-400/90 text-xs mt-1 leading-relaxed">
              {t("forgot.emailSentBody").replace("{{email}}", email)}
            </p>
            <p className="text-slate-400 text-xs mt-2 leading-relaxed">{t("forgot.spamHint")}</p>
          </div>
        </div>
        <Link
          href={loginHref}
          className={`inline-block mt-4 ${styles.link} text-sm font-medium`}
        >
          {t("forgot.backLogin")}
        </Link>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <p className="text-red-400 text-sm mb-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3" role="alert">
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={handleSend}
        disabled={loading}
        className={`w-full ${styles.btn} disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2`}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
        {loading ? t("forgot.sending") : t("forgot.sendEmailLink")}
      </button>
    </div>
  );
}

export function ForgotPasswordBackLink({
  lang,
  accent,
  href,
}: {
  lang: Lang;
  accent: LoginAccent;
  href: string;
}) {
  const t = (key: string) => translate(lang, key);
  const styles = getLoginAccentStyles(accent);
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition mb-6`}
    >
      <ArrowLeft className="w-4 h-4" aria-hidden />
      <span className={styles.link}>{t("forgot.back")}</span>
    </Link>
  );
}
