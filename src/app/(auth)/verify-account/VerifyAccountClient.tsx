"use client";

import Link from "next/link";
import { Mail, Smartphone, ArrowLeft } from "lucide-react";
import { translate, type Lang } from "@/lib/i18n/translations";
import {
  buildVerifyEmailHref,
  buildVerifyQueryString,
  resolveForgotPasswordContext,
} from "@/lib/auth-portals";
import { buildAuthHref } from "@/components/auth/login-shared";
import { ForgotPasswordLayout } from "@/components/auth/forgot-password-shared";
import { getLoginAccentStyles } from "@/components/auth/login-shared";

export default function VerifyAccountClient({
  lang,
  email,
  callbackUrl,
  from,
  smsEnabled,
}: {
  lang: Lang;
  email: string;
  callbackUrl: string;
  from: string;
  smsEnabled: boolean;
}) {
  const t = (key: string) => translate(lang, key);
  const { loginPath, accent } = resolveForgotPasswordContext(from);
  const styles = getLoginAccentStyles(accent);
  const verifyOpts = { email, callbackUrl: callbackUrl || undefined, from: loginPath };
  const loginHref = buildAuthHref(loginPath, { callbackUrl: callbackUrl || undefined });

  return (
    <ForgotPasswordLayout accent={accent}>
      <Link
        href={loginHref}
        className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition mb-6"
      >
        <ArrowLeft className="w-4 h-4" aria-hidden />
        <span className={styles.link}>{t("forgot.backLogin")}</span>
      </Link>

      <h2 className="text-2xl font-bold text-white mb-2 text-center">{t("verifyAccount.title")}</h2>
      <p className="text-slate-400 text-sm text-center mb-8 leading-relaxed">{t("verifyAccount.subtitle")}</p>

      <div className="space-y-3">
        <Link
          href={buildVerifyEmailHref(verifyOpts)}
          className="flex items-center gap-4 w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition"
        >
          <div className={`w-12 h-12 rounded-full border flex items-center justify-center shrink-0 ${styles.softBg}`}>
            <Mail className={`w-6 h-6 ${styles.softText}`} aria-hidden />
          </div>
          <div className="text-left">
            <p className="text-white font-semibold text-sm">{t("verifyAccount.emailTitle")}</p>
            <p className="text-slate-400 text-xs mt-0.5">{t("verifyAccount.emailDesc")}</p>
          </div>
        </Link>

        {smsEnabled ? (
          <Link
            href={`/verify-sms${buildVerifyQueryString({
              email,
              callbackUrl: callbackUrl || undefined,
              from: loginPath,
            })}`}
            className="flex items-center gap-4 w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition"
          >
            <div className="w-12 h-12 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-6 h-6 text-blue-400" aria-hidden />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">{t("verifyAccount.smsTitle")}</p>
              <p className="text-slate-400 text-xs mt-0.5">{t("verifyAccount.smsDesc")}</p>
            </div>
          </Link>
        ) : (
          <p className="text-slate-500 text-xs text-center pt-2">{t("verifyAccount.smsUnavailable")}</p>
        )}
      </div>

      {email && (
        <p className="text-slate-500 text-xs text-center mt-6 break-all">{email}</p>
      )}
    </ForgotPasswordLayout>
  );
}
