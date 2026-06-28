// Choose verification method after registration — server-rendered.

import Link from "next/link";
import { cookies, headers } from "next/headers";
import { Mail, Smartphone } from "lucide-react";
import { Lang, normalizeLang, translate } from "@/lib/i18n/translations";
import { isSmsConfigured } from "@/lib/sms";

export const dynamic = "force-dynamic";

function detectLang(): Lang {
  const cookieLang = cookies().get("doctor8.lang")?.value;
  if (cookieLang) return normalizeLang(cookieLang);

  const accept = (headers().get("accept-language") || "").toLowerCase();
  if (accept.startsWith("pt")) return "pt";
  if (accept.startsWith("es")) return "es";
  return "en";
}

export default function VerifyAccountPage({
  searchParams,
}: {
  searchParams: { email?: string; callbackUrl?: string };
}) {
  const lang = detectLang();
  const t = (key: string) => translate(lang, key);
  const email = searchParams.email || "";
  const callbackUrl = searchParams.callbackUrl || "";
  const smsEnabled = isSmsConfigured();

  const qs = new URLSearchParams();
  if (email) qs.set("email", email);
  if (callbackUrl) qs.set("callbackUrl", callbackUrl);
  const suffix = qs.toString() ? `?${qs.toString()}` : "";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Doctor<span className="text-emerald-400">8</span>
          </h1>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-2 text-center">
            {t("verifyAccount.title")}
          </h2>
          <p className="text-slate-400 text-sm text-center mb-8 leading-relaxed">
            {t("verifyAccount.subtitle")}
          </p>

          <div className="space-y-3">
            <Link
              href={`/verify-email${suffix}`}
              className="flex items-center gap-4 w-full bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl p-4 transition"
            >
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0">
                <Mail className="w-6 h-6 text-emerald-400" aria-hidden />
              </div>
              <div className="text-left">
                <p className="text-white font-semibold text-sm">{t("verifyAccount.emailTitle")}</p>
                <p className="text-slate-400 text-xs mt-0.5">{t("verifyAccount.emailDesc")}</p>
              </div>
            </Link>

            {smsEnabled ? (
              <Link
                href={`/verify-sms${suffix}`}
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
              <p className="text-slate-500 text-xs text-center pt-2">
                {t("verifyAccount.smsUnavailable")}
              </p>
            )}
          </div>

          {email && (
            <p className="text-slate-500 text-xs text-center mt-6 break-all">
              {email}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
