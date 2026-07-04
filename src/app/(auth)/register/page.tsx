"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { translate, normalizeLang, Lang } from "@/lib/i18n/translations";
import { LogIn } from "lucide-react";
import { buildAuthHref } from "@/components/auth/login-shared";
import { MAIN_LOGIN } from "@/lib/auth-portals";
import { resolveClientAuthCallbackUrl } from "@/lib/auth-callback";
import { syncHumanitarianOriginFromCallback } from "@/lib/humanitarian/origin-cookie";
import {
  detectInitialLang,
  LANG_KEY,
  RegisterAccountForm,
  RegisterAlternateLink,
  RegisterLanguageSelector,
  RegisterLogo,
  type Region,
} from "@/components/auth/register-shared";
import { parseRegistrationRegion, defaultRegistrationRegionForLang } from "@/lib/registration-regions";

export default function RegisterPage() {
  const [callbackUrl, setCallbackUrl] = useState("");
  const [initialRegion, setInitialRegion] = useState<Region>("US");
  const [lang, setLang] = useState<Lang>("en");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const fromQuery = params.get("callbackUrl") || "";
    const resolved = resolveClientAuthCallbackUrl(fromQuery);
    setCallbackUrl(resolved);
    syncHumanitarianOriginFromCallback(fromQuery || resolved || null);

    const r = params.get("region");
    if (r) {
      setInitialRegion(parseRegistrationRegion(r, "US"));
      return;
    }

    const langParam = params.get("lang");
    const detectedLang = langParam ? normalizeLang(langParam) : detectInitialLang();

    fetch(`/api/auth/detect-region?lang=${encodeURIComponent(detectedLang)}`)
      .then((res) => res.json())
      .then((data) => {
        if (data?.region) {
          setInitialRegion(parseRegistrationRegion(data.region, defaultRegistrationRegionForLang(detectedLang)));
        } else {
          setInitialRegion(defaultRegistrationRegionForLang(detectedLang));
        }
      })
      .catch(() => {
        setInitialRegion(defaultRegistrationRegionForLang(detectedLang));
      });

    if (langParam) {
      const l = normalizeLang(langParam);
      setLang(l);
      try { window.localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
    }
  }, []);

  useEffect(() => { setLang(detectInitialLang()); }, []);

  const t = (key: string) => translate(lang, key);

  function changeLang(l: Lang) {
    setLang(l);
    try { window.localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
  }

  const loginHref = buildAuthHref(MAIN_LOGIN, { callbackUrl });

  const proHref = callbackUrl
    ? `/register/professional?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/register/professional";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <RegisterLanguageSelector lang={lang} onChange={changeLang} />
        <RegisterLogo />

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          <Link
            href={loginHref}
            className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-emerald-500 hover:bg-emerald-500/10 transition text-left group mb-6"
          >
            <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition">
              <LogIn className="w-7 h-7 text-emerald-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-base">
                {t("reg.haveAccount")}{" "}
                <span className="text-emerald-400 group-hover:text-emerald-300">{t("reg.signIn")}</span>
              </p>
            </div>
          </Link>

          <RegisterAccountForm
            role="PATIENT"
            lang={lang}
            callbackUrl={callbackUrl}
            initialRegion={initialRegion}
          />
        </div>

        <RegisterAlternateLink href={proHref}>
          {t("reg.switchToPro")}
        </RegisterAlternateLink>
      </div>
    </div>
  );
}
