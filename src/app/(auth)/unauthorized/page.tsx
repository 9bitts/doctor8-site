"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { ShieldAlert, Loader2 } from "lucide-react";
import { resolveRoleHome } from "@/lib/role-home";
import { resolveLoginPathForSession } from "@/lib/auth-portals";
import {
  useLoginLang,
  LoginPageShell,
  LoginLanguageSelector,
  LoginHeader,
  LoginCard,
} from "@/components/auth/login-shared";

export default function UnauthorizedPage() {
  const pathname = usePathname();
  const { lang, changeLang, t } = useLoginLang();
  const [home, setHome] = useState("/login/paciente");
  const [sessionRole, setSessionRole] = useState<string | undefined>();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/auth/session")
      .then((r) => r.json())
      .then((session) => {
        const role = session?.user?.role;
        setSessionRole(role);
        if (role) {
          setHome(
            resolveRoleHome(role, session.user.professionalSpecialty),
          );
        }
      })
      .finally(() => setLoading(false));
  }, []);

  function handleSignOut() {
    signOut({
      callbackUrl: resolveLoginPathForSession(sessionRole, pathname),
    });
  }

  return (
    <LoginPageShell accent="emerald">
      <LoginLanguageSelector lang={lang} onChange={changeLang} accent="emerald" />
      <LoginHeader accent="emerald" />

      <LoginCard>
        <div className="text-center">
          <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/30 flex items-center justify-center mx-auto mb-6">
            <ShieldAlert className="w-8 h-8 text-amber-400" aria-hidden />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">{t("unauthorized.title")}</h1>
          <p className="text-slate-400 text-sm mb-8 leading-relaxed">{t("unauthorized.body")}</p>

          {loading ? (
            <Loader2 className="w-6 h-6 animate-spin text-slate-400 mx-auto" aria-label={t("login.callbackSigningIn")} />
          ) : (
            <div className="flex flex-col gap-3">
              <Link
                href={home}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition"
              >
                {t("unauthorized.goHome")}
              </Link>
              <button
                type="button"
                onClick={handleSignOut}
                className="w-full text-slate-400 hover:text-white text-sm py-2 transition"
              >
                {t("unauthorized.signOut")}
              </button>
            </div>
          )}
        </div>
      </LoginCard>
    </LoginPageShell>
  );
}
