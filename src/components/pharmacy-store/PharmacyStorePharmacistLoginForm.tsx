"use client";

import { useState, useEffect } from "react";
import { signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Pill } from "lucide-react";
import { persistAuthCallback, consumeAuthCallback, resolveClientAuthCallback } from "@/lib/auth-callback";
import { clearSensitiveClientState } from "@/lib/logout-cleanup";
import { safePostLoginUrl } from "@/lib/role-home";
import { buildForgotPasswordHref, PHARMACIST_REGISTER } from "@/lib/auth-portals";
import { canAccessPharmacyPharmacistPortal } from "@/lib/pharmacy-portal-guards";
import {
  PHARMACY_STORE_PHARMACIST_HOME,
  PHARMACY_STORE_PHARMACIST_LOGIN,
} from "@/lib/pharmacy-store-portal";
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

export default function PharmacyStorePharmacistLoginForm() {
  const searchParams = useSearchParams();
  const queryCallback = searchParams.get("callbackUrl") || "";
  const { callback: callbackUrl } = resolveClientAuthCallback(
    queryCallback || PHARMACY_STORE_PHARMACIST_HOME,
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
    from: PHARMACY_STORE_PHARMACIST_LOGIN,
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
        callbackUrl: callbackUrl || PHARMACY_STORE_PHARMACIST_HOME,
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
        if (!canAccessPharmacyPharmacistPortal(session.user.role, session.user.professionalSpecialty)) {
          setError("invalid");
          setLoading(false);
          await signOut({ redirect: false });
          return;
        }
        const savedCallback = consumeAuthCallback();
        const destination = safePostLoginUrl(
          session.user.role,
          savedCallback || callbackUrl || PHARMACY_STORE_PHARMACIST_HOME,
          undefined,
          session.user.professionalSpecialty,
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
      await signIn("google", { callbackUrl: callbackUrl || PHARMACY_STORE_PHARMACIST_HOME });
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
          <Pill size={22} />
          <span className="font-semibold text-lg">Doctor8 Farmácias</span>
        </div>
        <p className="text-slate-400 text-sm">Acesso farmacêutico — rede e dispensação</p>
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
          verifyFrom={PHARMACY_STORE_PHARMACIST_LOGIN}
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
            {t("login.noAccount")}{" "}
            <Link href={PHARMACIST_REGISTER} className="text-teal-400 hover:text-teal-300 font-medium">
              Cadastrar como farmacêutico
            </Link>
          </p>
          <Link href="/farmaceutico" className="block text-teal-400/80 text-xs hover:text-teal-300">
            Portal clínico (/farmaceutico)
          </Link>
          <Link href="/farmacias" className="text-slate-500 text-xs hover:text-slate-300 transition block">
            ← Voltar para doctor8.org/farmacias
          </Link>
        </div>
      </LoginCard>
    </LoginPageShell>
  );
}
