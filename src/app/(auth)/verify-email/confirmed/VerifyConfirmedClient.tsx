"use client";

import Link from "next/link";
import { CheckCircle2, AlertCircle, LogIn } from "lucide-react";
import { translate, type Lang } from "@/lib/i18n/translations";
import {
  resolveForgotPasswordContext,
  sanitizeLoginFrom,
  MAIN_LOGIN,
} from "@/lib/auth-portals";
import { buildAuthHref } from "@/components/auth/login-shared";
import { ForgotPasswordLayout } from "@/components/auth/forgot-password-shared";
import { getLoginAccentStyles } from "@/components/auth/login-shared";

export default function VerifyConfirmedClient({
  lang,
  isSuccess,
  error,
  from,
  callbackUrl,
}: {
  lang: Lang;
  isSuccess: boolean;
  error?: "invalid" | "failed";
  from?: string;
  callbackUrl?: string;
}) {
  const t = (key: string) => translate(lang, key);
  const loginFrom = sanitizeLoginFrom(from) ?? MAIN_LOGIN;
  const { loginPath, accent } = resolveForgotPasswordContext(loginFrom);
  const styles = getLoginAccentStyles(accent);
  const loginHref = buildAuthHref(loginPath, { callbackUrl });

  const title = isSuccess
    ? t("verifyConfirmed.title")
    : error === "failed"
      ? t("verifyConfirmed.failedTitle")
      : t("verifyConfirmed.invalidTitle");

  const body = isSuccess
    ? t("verifyConfirmed.body")
    : error === "failed"
      ? t("verifyConfirmed.failedBody")
      : t("verifyConfirmed.invalidBody");

  return (
    <ForgotPasswordLayout accent={accent}>
      <div className="text-center">
        <div
          className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border ${
            isSuccess ? styles.softBg : "bg-red-500/10 border-red-500/20"
          }`}
        >
          {isSuccess ? (
            <CheckCircle2 className={`w-10 h-10 ${styles.softText}`} aria-hidden />
          ) : (
            <AlertCircle className="w-10 h-10 text-red-400" aria-hidden />
          )}
        </div>

        <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
        <p className="text-slate-400 text-sm leading-relaxed mb-8">{body}</p>

        <Link
          href={loginHref}
          className={`inline-flex items-center justify-center gap-2 w-full ${styles.btn} text-white font-semibold py-3 rounded-xl transition`}
        >
          <LogIn className="w-4 h-4" aria-hidden />
          {t("verifyConfirmed.signIn")}
        </Link>

        {!isSuccess && (
          <p className="mt-6 text-slate-500 text-xs">
            <Link href="/verify-email" className={`${styles.link} transition`}>
              {t("verifyConfirmed.requestNew")}
            </Link>
          </p>
        )}
      </div>
    </ForgotPasswordLayout>
  );
}
