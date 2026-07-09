"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Stethoscope, Heart } from "lucide-react";
import { persistAuthCallback, consumeAuthCallback, resolveRegisterHref, resolveClientAuthCallback } from "@/lib/auth-callback";
import { clearSensitiveClientState } from "@/lib/logout-cleanup";
import { resolvePatientPostLoginUrl } from "@/lib/patient-home";
import { safePostLoginUrl } from "@/lib/role-home";
import { syncHumanitarianOriginFromCallback } from "@/lib/humanitarian/origin-cookie";
import {
  PATIENT_LOGIN,
  PROFESSIONAL_REGISTER,
  ANGEL_REGISTER,
  buildForgotPasswordHref,
  resolveProfessionalRegisterForPortal,
} from "@/lib/auth-portals";
import {
  useLoginLang,
  parseLoginError,
  resolveCredentialSignInError,
  LoginPageShell,
  LoginLanguageSelector,
  LoginHeader,
  LoginCard,
  LoginAlerts,
  GoogleSignInButton,
  LoginDivider,
  LoginCredentialsForm,
  LoginSuspenseFallback,
  navigateAfterAuth,
  waitForAuthenticatedSession,
  type LoginErrorCode,
} from "@/components/auth/login-shared";
import {
  LoginProfessionalPortals,
  loginTaglineForPortal,
} from "@/components/auth/LoginProfessionalPortals";

const POST_LOGIN_CALLBACK = "/callback";

function UnifiedLoginForm() {
  const searchParams = useSearchParams();
  const queryCallback = searchParams.get("callbackUrl") || "";
  const portal = searchParams.get("portal");
  const { callback: callbackUrl, fromHumCookie } = resolveClientAuthCallback(queryCallback);
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
  const registerHref = resolveRegisterHref(
    resolveProfessionalRegisterForPortal(portal),
    callbackUrl || null,
  );
  const professionalSignupHref = resolveRegisterHref(
    resolveProfessionalRegisterForPortal(portal),
    callbackUrl || null,
  );
  const forgotHref = buildForgotPasswordHref({
    email: email.trim() || undefined,
    from: PATIENT_LOGIN,
  });

  useEffect(() => {
    setError(parseLoginError(searchParams.get("error")));
  }, [searchParams]);

  useEffect(() => {
    syncHumanitarianOriginFromCallback(callbackUrl || queryCallback || null);
  }, [callbackUrl, queryCallback]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setUnverifiedEmail("");

    const trimmedEmail = email.trim().toLowerCase();

    try {
      // Clear any previous session so shared computers don't keep the last account.
      clearSensitiveClientState();
      await signOut({ redirect: false });

      const result = await signIn("credentials", {
        email: trimmedEmail,
        password,
        callbackUrl: callbackUrl || "",
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
        const savedCallback = consumeAuthCallback();
        navigateAfterAuth(
          safePostLoginUrl(
            session.user.role,
            savedCallback || callbackUrl || null,
            resolvePatientPostLoginUrl,
            session.user.professionalSpecialty,
            { fromHumCookie },
          ),
          session.user.role,
        );
        return;
      }

      // Session cookie not ready yet — fall back to /callback (OAuth-style recovery).
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
      await signIn("google", { callbackUrl: callbackUrl || POST_LOGIN_CALLBACK });
    } catch {
      setError("oauthFailed");
      setGoogleLoading(false);
    }
  }

  return (
    <LoginPageShell accent="emerald">
      <LoginLanguageSelector lang={lang} onChange={changeLang} accent="emerald" />
      <LoginHeader
        tagline={loginTaglineForPortal(portal, t) ?? t("login.unifiedTagline")}
        accent="emerald"
      />

      <LoginCard>
        <LoginAlerts
          error={error}
          verified={verified}
          passwordReset={passwordReset}
          registered={registered}
          unverifiedEmail={unverifiedEmail}
          t={t}
          roleOnlyKey="login.invalid"
          verifyFrom={PATIENT_LOGIN}
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
          accent="emerald"
          forgotHref={forgotHref}
          t={t}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onTogglePassword={() => setShowPassword((v) => !v)}
          onSubmit={handleSubmit}
          onClearError={() => { if (error && error !== "unverified") setError(""); }}
        />

        <div className="border-t border-white/10 mt-6 pt-6 text-center space-y-4">
          <p className="text-slate-400 text-sm">
            {t("login.noAccount")}{" "}
            <Link
              href={registerHref}
              className="text-emerald-400 hover:text-emerald-300 font-medium transition"
            >
              {t("login.createAccount")}
            </Link>
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-2 sm:gap-4 text-xs">
            <Link
              href={professionalSignupHref}
              className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white transition"
            >
              <Stethoscope size={14} aria-hidden />
              {t("login.professionalSignup")}
            </Link>
            <Link
              href={ANGEL_REGISTER}
              className="inline-flex items-center gap-1.5 text-rose-300 hover:text-rose-200 transition"
            >
              <Heart size={14} aria-hidden />
              {t("login.volunteerSignup")}
            </Link>
          </div>
        </div>

        <LoginProfessionalPortals t={t} callbackUrl={callbackUrl || undefined} />
      </LoginCard>
    </LoginPageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback accent="emerald" />}>
      <UnifiedLoginForm />
    </Suspense>
  );
}
