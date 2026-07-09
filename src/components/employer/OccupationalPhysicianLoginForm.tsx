"use client";

import { useState, useEffect } from "react";
import { signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Stethoscope } from "lucide-react";
import { persistAuthCallback, consumeAuthCallback, resolveClientAuthCallback } from "@/lib/auth-callback";
import { clearSensitiveClientState } from "@/lib/logout-cleanup";
import { safePostLoginUrl } from "@/lib/role-home";
import { buildForgotPasswordHref } from "@/lib/auth-portals";
import { OCCUPATIONAL_PHYSICIAN_HOME, OCCUPATIONAL_PHYSICIAN_LOGIN } from "@/lib/occupational-physician-portal";
import {
  useLoginLang,
  parseLoginError,
  resolveCredentialSignInError,
  LoginPageShell,
  LoginLanguageSelector,
  LoginCard,
  LoginAlerts,
  LoginCredentialsForm,
  navigateAfterAuth,
  waitForAuthenticatedSession,
  type LoginErrorCode,
} from "@/components/auth/login-shared";

const POST_LOGIN_CALLBACK = "/callback";

export default function OccupationalPhysicianLoginForm() {
  const searchParams = useSearchParams();
  const queryCallback = searchParams.get("callbackUrl") || "";
  const { callback: callbackUrl } = resolveClientAuthCallback(queryCallback || OCCUPATIONAL_PHYSICIAN_HOME);
  const { lang, changeLang, t } = useLoginLang(callbackUrl);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoginErrorCode>("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  const verified = searchParams.get("verified") === "true";
  const passwordReset = searchParams.get("reset") === "success";
  const registered = searchParams.get("registered") === "1";

  const forgotHref = buildForgotPasswordHref({
    email: email.trim() || undefined,
    from: OCCUPATIONAL_PHYSICIAN_LOGIN,
  });

  useEffect(() => {
    setError(parseLoginError(searchParams.get("error")));
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setUnverifiedEmail("");

    const trimmedEmail = email.trim().toLowerCase();

    try {
      clearSensitiveClientState();
      await signOut({ redirect: false });

      const result = await signIn("credentials", {
        email: trimmedEmail,
        password,
        callbackUrl: callbackUrl || OCCUPATIONAL_PHYSICIAN_HOME,
        redirect: false,
      });

      if (!result?.ok || result?.error) {
        const failure = resolveCredentialSignInError(result ?? {});
        setError(failure);
        if (failure === "unverified") {
          setUnverifiedEmail(trimmedEmail);
        }
        setLoading(false);
        return;
      }

      persistAuthCallback(callbackUrl);
      const session = await waitForAuthenticatedSession({ expectedEmail: trimmedEmail });
      if (session?.user?.role) {
        if (session.user.role !== "OCCUPATIONAL_PHYSICIAN" && session.user.role !== "ADMIN") {
          await signOut({ redirect: false });
          setError("invalid");
          setLoading(false);
          return;
        }
        const savedCallback = consumeAuthCallback();
        const destination = safePostLoginUrl(
          session.user.role,
          savedCallback || callbackUrl || OCCUPATIONAL_PHYSICIAN_HOME,
        );
        navigateAfterAuth(destination, session.user.role);
        return;
      }

      navigateAfterAuth(POST_LOGIN_CALLBACK);
    } catch (err) {
      setError(err instanceof TypeError ? "sessionTimeout" : "generic");
      setLoading(false);
    }
  }

  return (
    <LoginPageShell accent="teal">
      <LoginLanguageSelector lang={lang} onChange={changeLang} accent="teal" />

      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 text-teal-300 mb-2">
          <Stethoscope size={22} />
          <span className="font-semibold text-lg">Médico do Trabalho</span>
        </div>
        <p className="text-slate-400 text-sm">
          Acesso coordenador PCMSO — integração PGR e alertas de risco psicossocial.
        </p>
      </div>

      <LoginCard>
        <LoginAlerts
          error={error}
          verified={verified}
          passwordReset={passwordReset}
          registered={registered}
          unverifiedEmail={unverifiedEmail}
          t={t}
          roleOnlyKey="login.invalid"
          verifyFrom={OCCUPATIONAL_PHYSICIAN_LOGIN}
          callbackUrl={callbackUrl || undefined}
        />

        <LoginCredentialsForm
          email={email}
          password={password}
          showPassword={showPassword}
          loading={loading}
          googleLoading={false}
          accent="teal"
          forgotHref={forgotHref}
          t={t}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onTogglePassword={() => setShowPassword((v) => !v)}
          onSubmit={handleSubmit}
          onClearError={() => { if (error && error !== "unverified") setError(""); }}
        />

        <div className="border-t border-white/10 mt-6 pt-6 text-center space-y-3">
          <p className="text-slate-400 text-sm">
            Acesso da empresa (CNPJ)?{" "}
            <Link href="/empresas/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Login empresarial
            </Link>
            {" · "}
            <Link href="/empresas/psicologo/login" className="text-violet-400 hover:text-violet-300 font-medium">
              Psicólogo EAP
            </Link>
          </p>
          <Link href="/empresas" className="text-xs text-slate-500 hover:text-slate-300">
            ← Voltar para Doctor8 Empresas
          </Link>
        </div>
      </LoginCard>
    </LoginPageShell>
  );
}
