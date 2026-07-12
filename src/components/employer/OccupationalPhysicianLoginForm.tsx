"use client";

import { useState, useEffect } from "react";
import { signIn, signOut, useSession } from "next-auth/react";
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
  GoogleSignInButton,
  LoginDivider,
  LoginCredentialsForm,
  navigateAfterAuth,
  waitForAuthenticatedSession,
  type LoginErrorCode,
} from "@/components/auth/login-shared";

const POST_LOGIN_CALLBACK = "/callback";

function canAccessOccupationalPhysicianPortal(role: string): boolean {
  return role === "OCCUPATIONAL_PHYSICIAN" || role === "ADMIN";
}

export default function OccupationalPhysicianLoginForm() {
  const searchParams = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();
  const queryCallback = searchParams.get("callbackUrl") || "";
  const { callback: callbackUrl } = resolveClientAuthCallback(queryCallback || OCCUPATIONAL_PHYSICIAN_HOME);
  const { lang, changeLang, t } = useLoginLang(callbackUrl);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<LoginErrorCode>("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");
  const [oauthHandled, setOauthHandled] = useState(false);

  const verified = searchParams.get("verified") === "true";
  const passwordReset = searchParams.get("reset") === "success";
  const registered = searchParams.get("registered") === "1";
  const fromOAuth = searchParams.get("oauth") === "1";

  const forgotHref = buildForgotPasswordHref({
    email: email.trim() || undefined,
    from: OCCUPATIONAL_PHYSICIAN_LOGIN,
  });

  useEffect(() => {
    setError(parseLoginError(searchParams.get("error")));
  }, [searchParams]);

  useEffect(() => {
    if (!fromOAuth || oauthHandled || sessionStatus !== "authenticated" || !session?.user?.role) {
      return;
    }
    setOauthHandled(true);

    async function finishOAuth() {
      if (!canAccessOccupationalPhysicianPortal(session!.user!.role)) {
        await signOut({ redirect: false });
        setError("invalid");
        setGoogleLoading(false);
        return;
      }
      const savedCallback = consumeAuthCallback();
      const destination = safePostLoginUrl(
        session!.user!.role,
        savedCallback || callbackUrl || OCCUPATIONAL_PHYSICIAN_HOME,
      );
      navigateAfterAuth(destination, session!.user!.role);
    }

    finishOAuth().catch(() => {
      setError("oauthFailed");
      setGoogleLoading(false);
    });
  }, [fromOAuth, oauthHandled, sessionStatus, session, callbackUrl]);

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
      const authSession = await waitForAuthenticatedSession({ expectedEmail: trimmedEmail });
      if (authSession?.user?.role) {
        if (!canAccessOccupationalPhysicianPortal(authSession.user.role)) {
          await signOut({ redirect: false });
          setError("invalid");
          setLoading(false);
          return;
        }
        const savedCallback = consumeAuthCallback();
        const destination = safePostLoginUrl(
          authSession.user.role,
          savedCallback || callbackUrl || OCCUPATIONAL_PHYSICIAN_HOME,
        );
        navigateAfterAuth(destination, authSession.user.role);
        return;
      }

      navigateAfterAuth(POST_LOGIN_CALLBACK);
    } catch (err) {
      setError(err instanceof TypeError ? "sessionTimeout" : "generic");
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError("");
    persistAuthCallback(callbackUrl);
    try {
      clearSensitiveClientState();
      await signOut({ redirect: false });
      const returnUrl = `${OCCUPATIONAL_PHYSICIAN_LOGIN}?oauth=1${
        callbackUrl ? `&callbackUrl=${encodeURIComponent(callbackUrl)}` : ""
      }`;
      await signIn("google", { callbackUrl: returnUrl });
    } catch {
      setError("oauthFailed");
      setGoogleLoading(false);
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

        <GoogleSignInButton
          loading={googleLoading}
          disabled={googleLoading || loading}
          onClick={handleGoogleSignIn}
          t={t}
          labelKey="login.continueGoogle"
        />

        <LoginDivider t={t} />

        <LoginCredentialsForm
          email={email}
          password={password}
          showPassword={showPassword}
          loading={loading}
          googleLoading={googleLoading}
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
