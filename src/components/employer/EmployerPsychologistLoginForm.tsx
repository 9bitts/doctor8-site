"use client";

import { useState, useEffect } from "react";
import { signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Brain } from "lucide-react";
import { persistAuthCallback, consumeAuthCallback, resolveClientAuthCallback } from "@/lib/auth-callback";
import { clearSensitiveClientState } from "@/lib/logout-cleanup";
import { safePostLoginUrl } from "@/lib/role-home";
import { buildForgotPasswordHref } from "@/lib/auth-portals";
import { isPsychologistSpecialty } from "@/lib/psychologist-portal";
import {
  EMPLOYER_PSYCHOLOGIST_HOME,
  EMPLOYER_PSYCHOLOGIST_LOGIN,
  EMPLOYER_PSYCHOLOGIST_REGISTER,
} from "@/lib/employer-psychologist-portal";
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

function canAccessEmployerPsychologistPortal(
  role: string,
  specialty?: string | null,
): boolean {
  if (role === "ADMIN") return true;
  return role === "PROFESSIONAL" && isPsychologistSpecialty(specialty);
}

export default function EmployerPsychologistLoginForm() {
  const searchParams = useSearchParams();
  const queryCallback = searchParams.get("callbackUrl") || "";
  const { callback: callbackUrl } = resolveClientAuthCallback(
    queryCallback || EMPLOYER_PSYCHOLOGIST_HOME,
  );
  const { lang, changeLang, t } = useLoginLang(callbackUrl);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<LoginErrorCode>("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  const verified = searchParams.get("verified") === "true";
  const passwordReset = searchParams.get("reset") === "success";
  const registered = searchParams.get("registered") === "1";

  const forgotHref = buildForgotPasswordHref({
    email: email.trim() || undefined,
    from: EMPLOYER_PSYCHOLOGIST_LOGIN,
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
        callbackUrl: callbackUrl || EMPLOYER_PSYCHOLOGIST_HOME,
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
        const specialty = (session.user as { professionalSpecialty?: string | null })
          .professionalSpecialty;
        if (!canAccessEmployerPsychologistPortal(session.user.role, specialty)) {
          await signOut({ redirect: false });
          setError("invalid");
          setLoading(false);
          return;
        }
        const savedCallback = consumeAuthCallback();
        const destination = safePostLoginUrl(
          session.user.role,
          savedCallback || callbackUrl || EMPLOYER_PSYCHOLOGIST_HOME,
          undefined,
          specialty,
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

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError("");
    persistAuthCallback(callbackUrl);
    try {
      clearSensitiveClientState();
      await signOut({ redirect: false });
      await signIn("google", { callbackUrl: callbackUrl || EMPLOYER_PSYCHOLOGIST_HOME });
    } catch {
      setError("oauthFailed");
      setGoogleLoading(false);
    }
  }

  return (
    <LoginPageShell accent="violet">
      <LoginLanguageSelector lang={lang} onChange={changeLang} accent="violet" />

      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 text-violet-300 mb-2">
          <Brain size={22} />
          <span className="font-semibold text-lg">Psicólogo · Doctor8 Empresas</span>
        </div>
        <p className="text-slate-400 text-sm">
          Atendimentos EAP e rede corporativa — use o mesmo portal clínico Doctor8.
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
          verifyFrom={EMPLOYER_PSYCHOLOGIST_LOGIN}
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
          accent="violet"
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
            Ainda não tem conta?{" "}
            <Link href={EMPLOYER_PSYCHOLOGIST_REGISTER} className="text-violet-400 hover:text-violet-300 font-medium">
              Cadastrar como psicólogo
            </Link>
          </p>
          <p className="text-slate-400 text-sm">
            Empresa (CNPJ)?{" "}
            <Link href="/empresas/login" className="text-indigo-400 hover:text-indigo-300 font-medium">
              Login empresarial
            </Link>
            {" · "}
            <Link href="/empresas/medico/login" className="text-teal-400 hover:text-teal-300 font-medium">
              Médico PCMSO
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
