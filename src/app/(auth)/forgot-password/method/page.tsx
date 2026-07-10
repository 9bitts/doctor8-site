// Choose password reset method — email link or SMS code.

import Link from "next/link";
import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { Mail, Smartphone } from "lucide-react";
import { Lang, normalizeLang, translate } from "@/lib/i18n/translations";
import { isSmsUserFacingEnabled, isAwsSnsConfigured, isAwsSnsProductionReady } from "@/lib/sms";
import {
  buildForgotPasswordHref,
  resolveForgotPasswordContext,
} from "@/lib/auth-portals";
import { ForgotPasswordBackLink, SendResetEmailButton } from "../ForgotPasswordClient";
import { ForgotPasswordLayout } from "@/components/auth/forgot-password-shared";
import { getLoginAccentStyles } from "@/lib/auth/login-accent-styles";

export const dynamic = "force-dynamic";

function detectLang(): Lang {
  const cookieLang = cookies().get("doctor8.lang")?.value;
  if (cookieLang) return normalizeLang(cookieLang);

  const accept = (headers().get("accept-language") || "").toLowerCase();
  if (accept.startsWith("pt")) return "pt";
  if (accept.startsWith("es")) return "es";
  return "en";
}

export default function ForgotPasswordMethodPage({
  searchParams,
}: {
  searchParams: { email?: string; from?: string };
}) {
  const lang = detectLang();
  const t = (key: string) => translate(lang, key);
  const email = (searchParams.email || "").trim().toLowerCase();
  const { loginPath, accent } = resolveForgotPasswordContext(searchParams.from);
  const styles = getLoginAccentStyles(accent);
  const smsEnabled = isSmsUserFacingEnabled();
  const smsPendingAws = isAwsSnsConfigured() && !isAwsSnsProductionReady();

  if (!email) {
    return (
      <ForgotPasswordShell accent={accent}>
        <p className="text-slate-400 text-sm text-center">
          <Link href={buildForgotPasswordHref({ from: loginPath })} className={`${styles.link} underline`}>
            {t("forgot.enterEmail")}
          </Link>
        </p>
      </ForgotPasswordShell>
    );
  }

  const smsHref = buildForgotPasswordHref({ email, from: loginPath });

  return (
    <ForgotPasswordShell accent={accent}>
      <ForgotPasswordBackLink
        lang={lang}
        accent={accent}
        href={buildForgotPasswordHref({ from: loginPath })}
      />
      <h2 className="text-xl font-bold text-white mb-2">{t("forgot.methodTitle")}</h2>
      <p className="text-slate-400 text-sm mb-2">{t("forgot.methodSubtitle")}</p>
      <p className={`${styles.softText} text-xs mb-6 break-all`}>{email}</p>

      <div className="space-y-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className={`w-10 h-10 rounded-full border flex items-center justify-center ${styles.softBg}`}>
              <Mail className={`w-5 h-5 ${styles.softText}`} aria-hidden />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{t("forgot.emailOption")}</p>
              <p className="text-slate-400 text-xs">{t("forgot.emailOptionDesc")}</p>
            </div>
          </div>
          <SendResetEmailButton
            email={email}
            lang={lang}
            accent={accent}
            loginPath={loginPath}
          />
        </div>

        {smsEnabled ? (
          <Link
            href={smsHref}
            className="flex items-center gap-4 w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-blue-400" aria-hidden />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">{t("forgot.smsOption")}</p>
              <p className="text-slate-400 text-xs">{t("forgot.smsOptionDesc")}</p>
            </div>
          </Link>
        ) : (
          <p className="text-slate-500 text-xs text-center">
            {smsPendingAws ? t("forgot.smsPendingApproval") : t("forgot.smsUnavailable")}
          </p>
        )}
      </div>
    </ForgotPasswordShell>
  );
}

function ForgotPasswordShell({
  accent,
  children,
}: {
  accent: ReturnType<typeof resolveForgotPasswordContext>["accent"];
  children: ReactNode;
}) {
  return (
    <ForgotPasswordLayout accent={accent}>
      {children}
    </ForgotPasswordLayout>
  );
}
