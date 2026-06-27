// Choose password reset method ? email link or SMS code.

import Link from "next/link";
import type { ReactNode } from "react";
import { cookies, headers } from "next/headers";
import { Mail, Smartphone } from "lucide-react";
import { Lang, normalizeLang, translate } from "@/lib/i18n/translations";
import { isSmsConfigured } from "@/lib/sms";
import { ForgotPasswordBackLink, SendResetEmailButton } from "../ForgotPasswordClient";

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
  searchParams: { email?: string };
}) {
  const lang = detectLang();
  const t = (key: string) => translate(lang, key);
  const email = (searchParams.email || "").trim().toLowerCase();
  const smsEnabled = isSmsConfigured();

  if (!email) {
    return (
      <ForgotPasswordShell lang={lang}>
        <p className="text-slate-400 text-sm text-center">
          <Link href="/forgot-password" className="text-emerald-400 underline">
            {t("forgot.enterEmail")}
          </Link>
        </p>
      </ForgotPasswordShell>
    );
  }

  const smsHref = `/forgot-password/sms?email=${encodeURIComponent(email)}`;

  return (
    <ForgotPasswordShell lang={lang}>
      <ForgotPasswordBackLink lang={lang} />
      <h2 className="text-xl font-bold text-white mb-2">{t("forgot.methodTitle")}</h2>
      <p className="text-slate-400 text-sm mb-2">{t("forgot.methodSubtitle")}</p>
      <p className="text-emerald-400 text-xs mb-6 break-all">{email}</p>

      <div className="space-y-4">
        <div className="bg-white/5 border border-white/10 rounded-xl p-4">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center">
              <Mail className="w-5 h-5 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-sm">{t("forgot.emailOption")}</p>
              <p className="text-slate-400 text-xs">{t("forgot.emailOptionDesc")}</p>
            </div>
          </div>
          <SendResetEmailButton email={email} lang={lang} />
        </div>

        {smsEnabled ? (
          <Link
            href={smsHref}
            className="flex items-center gap-4 w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition"
          >
            <div className="w-10 h-10 rounded-full bg-blue-500/10 border border-blue-500/20 flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5 text-blue-400" />
            </div>
            <div className="text-left">
              <p className="text-white font-semibold text-sm">{t("forgot.smsOption")}</p>
              <p className="text-slate-400 text-xs">{t("forgot.smsOptionDesc")}</p>
            </div>
          </Link>
        ) : (
          <p className="text-slate-500 text-xs text-center">{t("forgot.smsUnavailable")}</p>
        )}
      </div>
    </ForgotPasswordShell>
  );
}

function ForgotPasswordShell({
  lang,
  children,
}: {
  lang: Lang;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Doctor<span className="text-emerald-400">8</span>
          </h1>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}
