"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { persistAuthCallback, resolveRegisterHref } from "@/lib/auth-callback";
import { resolvePatientPostLoginUrl } from "@/lib/patient-home";
import { safePostLoginUrl } from "@/lib/role-home";
import {
  PROFESSIONAL_REGISTER,
  PORTAL_LOGINS,
  MAIN_LOGIN,
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
  type LoginErrorCode,
} from "@/components/auth/login-shared";

const PRO_REGISTER = PROFESSIONAL_REGISTER;

function LoginForm() {
  const router = useRouter();
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
    searchParams.get("registerUrl"),
    callbackUrl || null,
  );
  const forgotHref = buildForgotPasswordHref({
    email: email.trim() || undefined,
    from: MAIN_LOGIN,
  });

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

      if (result?.error) {
        if (
          result.error === "EmailNotVerified" ||
          result.error.includes("EmailNotVerified")
        ) {
          setError("unverified");
          setUnverifiedEmail(trimmedEmail);
        } else if (
          result.error === "AccountLocked" ||
          result.error.includes("AccountLocked")
        ) {
          setError("locked");
        } else {
          setError("invalid");
        }
        setLoading(false);
        return;
      }

      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const role = session?.user?.role;

      router.push(
        safePostLoginUrl(
          role,
          callbackUrl || null,
          resolvePatientPostLoginUrl,
          session?.user?.professionalSpecialty,
        ),
      );
      router.refresh();
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
      await signIn("google", { callbackUrl: "/callback" });
    } catch {
      setError("generic");
      setGoogleLoading(false);
    }
  }

  return (
    <LoginPageShell accent="emerald">
      <LoginLanguageSelector lang={lang} onChange={changeLang} accent="emerald" />
      <LoginHeader tagline={t("login.tagline")} accent="emerald" />

      <LoginCard>
        <LoginAlerts
          error={error}
          verified={verified}
          passwordReset={passwordReset}
          unverifiedEmail={unverifiedEmail}
          t={t}
          verifyFrom={MAIN_LOGIN}
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

        <div className="border-t border-white/10 mt-6 pt-6 text-center">
          <p className="text-slate-400 text-sm">
            {t("login.noAccount")}{" "}
            <Link
              href={registerHref}
              className="text-emerald-400 hover:text-emerald-300 font-medium transition"
            >
              {t("login.createAccount")}
            </Link>
          </p>
          <p className="text-slate-400 text-xs mt-4">{t("login.proPortalHint")}</p>
          <div className="mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-xs">
            <Link
              href={buildAuthHref("/login", { callbackUrl, registerUrl: PRO_REGISTER })}
              className="text-emerald-300 hover:text-emerald-200 font-medium transition"
            >
              {t("login.proDoctorPortal")}
            </Link>
            {portalLinks.map((portal) => (
              <span key={portal.labelKey} className="contents">
                <span className="text-slate-600" aria-hidden="true">·</span>
                <Link href={portal.href} className={`${portal.className} font-medium transition`}>
                  {t(portal.labelKey)}
                </Link>
              </span>
            ))}
          </div>
        </div>
      </LoginCard>
    </LoginPageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback accent="emerald" />}>
      <LoginForm />
    </Suspense>
  );
}
