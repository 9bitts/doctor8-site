"use client";

import { useEffect, useState, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { MAIN_LOGIN } from "@/lib/auth-portals";
import {
  useLoginLang,
  LoginPageShell,
  LoginLanguageSelector,
  LoginHeader,
  LoginCard,
  LoginSuspenseFallback,
  buildAuthHref,
} from "@/components/auth/login-shared";

function MagicLinkContent() {
  const { lang, changeLang, t } = useLoginLang();
  const searchParams = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = searchParams.get("token");
    const callback = searchParams.get("callback") || "/patient/appointments";

    if (!token) {
      setError("invalid");
      return;
    }

    signIn("magic-link", {
      token,
      redirect: true,
      callbackUrl: callback,
    }).catch(() => setError("failed"));
  }, [searchParams]);

  if (error) {
    return (
      <LoginPageShell accent="emerald">
        <LoginLanguageSelector lang={lang} onChange={changeLang} accent="emerald" />
        <LoginHeader accent="emerald" />
        <LoginCard>
          <div className="text-center">
            <h1 className="text-lg font-bold text-white mb-2">
              {error === "invalid" ? t("auth.magic.invalidTitle") : t("auth.magic.failedTitle")}
            </h1>
            <p className="text-slate-400 text-sm mb-6">{t("auth.magic.expiredHint")}</p>
            <Link
              href={buildAuthHref(MAIN_LOGIN)}
              className="inline-block bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-2.5 rounded-xl text-sm transition"
            >
              {t("auth.magic.goToLogin")}
            </Link>
          </div>
        </LoginCard>
      </LoginPageShell>
    );
  }

  return (
    <LoginPageShell accent="emerald">
      <LoginLanguageSelector lang={lang} onChange={changeLang} accent="emerald" />
      <div className="text-center py-16">
        <Loader2 className="w-8 h-8 text-emerald-400 animate-spin mx-auto mb-4" aria-hidden />
        <p className="text-slate-400 text-sm" role="status">{t("auth.magic.signingIn")}</p>
      </div>
    </LoginPageShell>
  );
}

export default function MagicLinkPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback accent="emerald" />}>
      <MagicLinkContent />
    </Suspense>
  );
}
