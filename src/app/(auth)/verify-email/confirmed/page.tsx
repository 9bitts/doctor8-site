// Server-rendered confirmation after email verification — no client JS required.

import Link from "next/link";
import { cookies, headers } from "next/headers";
import { CheckCircle2, AlertCircle, LogIn } from "lucide-react";
import { Lang, normalizeLang, translate } from "@/lib/i18n/translations";

export const dynamic = "force-dynamic";

function detectLang(): Lang {
  const cookieLang = cookies().get("doctor8.lang")?.value;
  if (cookieLang) return normalizeLang(cookieLang);

  const accept = (headers().get("accept-language") || "").toLowerCase();
  if (accept.startsWith("pt")) return "pt";
  if (accept.startsWith("es")) return "es";
  return "en";
}

type ErrorCode = "invalid" | "failed";

export default function VerifyEmailConfirmedPage({
  searchParams,
}: {
  searchParams: { error?: string; from?: string };
}) {
  const lang = detectLang();
  const t = (key: string) => translate(lang, key);
  const error = searchParams.error as ErrorCode | undefined;
  const isSuccess = !error;
  const loginHref =
    searchParams.from?.startsWith("/login") ? searchParams.from : "/login";

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
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Doctor<span className="text-emerald-400">8</span>
          </h1>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
          <div
            className={`w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6 border ${
              isSuccess
                ? "bg-emerald-500/10 border-emerald-500/20"
                : "bg-red-500/10 border-red-500/20"
            }`}
          >
            {isSuccess ? (
              <CheckCircle2 className="w-10 h-10 text-emerald-400" aria-hidden />
            ) : (
              <AlertCircle className="w-10 h-10 text-red-400" aria-hidden />
            )}
          </div>

          <h2 className="text-2xl font-bold text-white mb-3">{title}</h2>
          <p className="text-slate-400 text-sm leading-relaxed mb-8">{body}</p>

          <Link
            href={loginHref}
            className="inline-flex items-center justify-center gap-2 w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition"
          >
            <LogIn className="w-4 h-4" aria-hidden />
            {t("verifyConfirmed.signIn")}
          </Link>

          {!isSuccess && (
            <p className="mt-6 text-slate-500 text-xs">
              <Link
                href="/verify-email"
                className="text-emerald-400 hover:text-emerald-300 transition"
              >
                {t("verifyConfirmed.requestNew")}
              </Link>
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
