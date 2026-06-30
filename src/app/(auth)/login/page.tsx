"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Stethoscope, Heart } from "lucide-react";
import { persistAuthCallback, consumeAuthCallback, resolveRegisterHref } from "@/lib/auth-callback";
import { resolvePatientPostLoginUrl } from "@/lib/patient-home";
import { safePostLoginUrl } from "@/lib/role-home";
import {
  PATIENT_LOGIN,
  PROFESSIONAL_REGISTER,
  ANGEL_REGISTER,
  buildForgotPasswordHref,
} from "@/lib/auth-portals";
import {
  useLoginLang,
  parseLoginError,
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

const POST_LOGIN_CALLBACK = "/callback";

function UnifiedLoginForm() {
  const searchParams = useSearchParams();
  const { lang, changeLang, t } = useLoginLang();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState<LoginErrorCode>("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  const verified = searchParams.get("verified") === "true";
  const passwordReset = searchParams.get("reset") === "success";
  const callbackUrl = searchParams.get("callbackUrl") || "";
  const registerHref = resolveRegisterHref(null, callbackUrl || null);
  const forgotHref = buildForgotPasswordHref({
    email: email.trim() || undefined,
    from: PATIENT_LOGIN,
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
      const checkRes = await fetch("/api/auth/check-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });

      if (checkRes.ok) {
        const { needsVerification } = await checkRes.json();
        if (needsVerification) {
          setError("unverified");
          setUnverifiedEmail(trimmedEmail);
          setLoading(false);
          return;
        }
      }

      // Clear any previous session so shared computers don't keep the last account.
      await signOut({ redirect: false });

      const result = await signIn("credentials", {
        email: trimmedEmail,
        password,
        redirect: false,
      });

      if (!result?.ok || result?.error) {
        if (
          result?.error === "EmailNotVerified" ||
          result?.error?.includes("EmailNotVerified")
        ) {
          setError("unverified");
          setUnverifiedEmail(trimmedEmail);
        } else if (
          result?.error === "AccountLocked" ||
          result?.error?.includes("AccountLocked")
        ) {
          setError("locked");
        } else {
          setError("invalid");
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
          ),
        );
        return;
      }

      // Session cookie not ready yet — fall back to /callback (OAuth-style recovery).
      navigateAfterAuth(POST_LOGIN_CALLBACK);
    } catch {
      setError("generic");
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError("");
    persistAuthCallback(callbackUrl);
    try {
      await signOut({ redirect: false });
      await signIn("google", { callbackUrl: POST_LOGIN_CALLBACK });
    } catch {
      setError("generic");
      setGoogleLoading(false);
    }
  }

  return (
    <LoginPageShell accent="emerald">
      <LoginLanguageSelector lang={lang} onChange={changeLang} accent="emerald" />
      <LoginHeader tagline={t("login.unifiedTagline")} accent="emerald" />

      <LoginCard>
        <LoginAlerts
          error={error}
          verified={verified}
          passwordReset={passwordReset}
          unverifiedEmail={unverifiedEmail}
          t={t}
          verifyFrom={PATIENT_LOGIN}
          roleOnlyKey="login.invalid"
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
              href={PROFESSIONAL_REGISTER}
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
