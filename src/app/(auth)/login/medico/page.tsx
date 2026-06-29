"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { persistAuthCallback, resolveRegisterHref } from "@/lib/auth-callback";
import {
  DOCTOR_LOGIN,
  PATIENT_LOGIN,
  PROFESSIONAL_REGISTER,
  PORTAL_LOGINS,
  buildForgotPasswordHref,
} from "@/lib/auth-portals";
import {
  useLoginLang,
  buildAuthHref,
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
  type LoginErrorCode,
} from "@/components/auth/login-shared";

function DoctorLoginForm() {
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
  const registerHref = resolveRegisterHref(
    searchParams.get("registerUrl") || PROFESSIONAL_REGISTER,
    callbackUrl || null,
  );
  const forgotHref = buildForgotPasswordHref({
    email: email.trim() || undefined,
    from: DOCTOR_LOGIN,
  });
  const patientLoginHref = buildAuthHref(PATIENT_LOGIN, { callbackUrl });

  const portalLinks = PORTAL_LOGINS.map((portal) => ({
    href: buildAuthHref(portal.loginPath, { callbackUrl }),
    labelKey: portal.footerLabelKey,
    className: portal.footerLinkClass,
  }));

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
      navigateAfterAuth("/callback?portal=doctor");
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
      await fetch("/api/auth/oauth-intent", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role: "PROFESSIONAL" }),
      });
      await signIn("google", { callbackUrl: "/callback?portal=doctor" });
    } catch {
      setError("generic");
      setGoogleLoading(false);
    }
  }

  return (
    <LoginPageShell accent="emerald">
      <LoginLanguageSelector lang={lang} onChange={changeLang} accent="emerald" />
      <LoginHeader tagline={t("login.doctorTagline")} accent="emerald" />

      <LoginCard>
        <LoginAlerts
          error={error}
          verified={verified}
          passwordReset={passwordReset}
          unverifiedEmail={unverifiedEmail}
          t={t}
          verifyFrom={DOCTOR_LOGIN}
        />

        <GoogleSignInButton
          loading={googleLoading}
          disabled={googleLoading || loading}
          onClick={handleGoogleSignIn}
          t={t}
          labelKey="login.googleDoctor"
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

        <div className="border-t border-white/10 mt-6 pt-6 text-center space-y-3">
          <p className="text-slate-400 text-sm">
            {t("login.noAccount")}{" "}
            <Link
              href={registerHref}
              className="text-emerald-400 hover:text-emerald-300 font-medium transition"
            >
              {t("login.createAccount")}
            </Link>
          </p>
          <p className="text-slate-400 text-xs">{t("login.proPortalHint")}</p>
          <div className="mt-1 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
            {portalLinks.map((portal) => (
              <Link key={portal.labelKey} href={portal.href} className={`${portal.className} font-medium transition`}>
                {t(portal.labelKey)}
              </Link>
            ))}
          </div>
          <Link
            href={patientLoginHref}
            className="inline-block text-xs text-slate-400 hover:text-slate-200 transition"
          >
            {t("login.patientPortalLink")}
          </Link>
        </div>
      </LoginCard>
    </LoginPageShell>
  );
}

export default function DoctorLoginPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback accent="emerald" />}>
      <DoctorLoginForm />
    </Suspense>
  );
}
