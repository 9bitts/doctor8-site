"use client";

import { Suspense, useEffect, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Heart } from "lucide-react";
import { persistAuthCallback, consumeAuthCallback, resolveClientAuthCallback } from "@/lib/auth-callback";
import { clearSensitiveClientState } from "@/lib/logout-cleanup";
import { safePostLoginUrl } from "@/lib/role-home";
import {
  ANGEL_LOGIN,
  ANGEL_REGISTER,
  buildForgotPasswordHref,
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
import { loginTaglineForPortal } from "@/components/auth/LoginProfessionalPortals";

const DEFAULT_CALLBACK = "/admin/angel";
const POST_LOGIN_CALLBACK = "/callback";

function AngelLoginForm() {
  const searchParams = useSearchParams();
  const queryCallback = searchParams.get("callbackUrl") || "";
  const { callback: callbackUrl } = resolveClientAuthCallback(queryCallback || DEFAULT_CALLBACK);
  const effectiveCallback = callbackUrl || DEFAULT_CALLBACK;
  const { lang, changeLang, t } = useLoginLang(effectiveCallback);

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
    from: ANGEL_LOGIN,
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
        callbackUrl: effectiveCallback,
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

      persistAuthCallback(effectiveCallback);
      const session = await waitForAuthenticatedSession({ expectedEmail: trimmedEmail });
      if (session?.user?.role) {
        const savedCallback = consumeAuthCallback();
        navigateAfterAuth(
          safePostLoginUrl(
            session.user.role,
            savedCallback || effectiveCallback,
            undefined,
            session.user.professionalSpecialty,
          ),
          session.user.role,
        );
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
    persistAuthCallback(effectiveCallback);
    try {
      clearSensitiveClientState();
      await signOut({ redirect: false });
      await signIn("google", { callbackUrl: effectiveCallback || POST_LOGIN_CALLBACK });
    } catch {
      setError("oauthFailed");
      setGoogleLoading(false);
    }
  }

  return (
    <LoginPageShell accent="rose">
      <LoginLanguageSelector lang={lang} onChange={changeLang} accent="rose" />
      <LoginHeader
        tagline={loginTaglineForPortal("angel", t) ?? t("login.angelTagline")}
        accent="rose"
        icon="heart"
      />

      <LoginCard>
        <LoginAlerts
          error={error}
          verified={verified}
          passwordReset={passwordReset}
          registered={registered}
          unverifiedEmail={unverifiedEmail}
          t={t}
          roleOnlyKey="login.angelOnly"
          verifyFrom={ANGEL_LOGIN}
          callbackUrl={effectiveCallback}
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
          accent="rose"
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
              href={`${ANGEL_REGISTER}?callbackUrl=${encodeURIComponent(effectiveCallback)}`}
              className="text-rose-300 hover:text-rose-200 font-medium transition"
            >
              {t("login.volunteerSignup")}
            </Link>
          </p>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition"
          >
            <Heart size={14} aria-hidden />
            {t("login.backToMain")}
          </Link>
        </div>
      </LoginCard>
    </LoginPageShell>
  );
}

export default function AngelLoginPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback accent="rose" />}>
      <AngelLoginForm />
    </Suspense>
  );
}
