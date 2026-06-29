"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { persistAuthCallback, resolveRegisterHref } from "@/lib/auth-callback";
import {
  PSYCHOLOGIST_HOME,
  PSYCHOLOGIST_REGISTER,
  isPsychologistSpecialty,
} from "@/lib/psychologist-portal";
import { safePostLoginUrl } from "@/lib/role-home";
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

function PsychologistLoginForm() {
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
  const callbackUrl = searchParams.get("callbackUrl") || "";
  const registerHref = resolveRegisterHref(
    searchParams.get("registerUrl") || PSYCHOLOGIST_REGISTER,
    callbackUrl || null,
  );
  const mainLoginHref = buildAuthHref("/login", { callbackUrl });
  const forgotHref = email.trim()
    ? `/forgot-password/method?email=${encodeURIComponent(email.trim().toLowerCase())}`
    : "/forgot-password";

  useEffect(() => {
    setError(parseLoginError(searchParams.get("error")));
  }, [searchParams]);

  async function resolvePsychologistDestination(): Promise<string> {
    const profRes = await fetch("/api/professional/profile");
    let specialty: string | null = null;
    if (profRes.ok) {
      const { profile } = await profRes.json();
      specialty = profile?.specialty ?? null;
      if (callbackUrl) {
        return safePostLoginUrl("PROFESSIONAL", callbackUrl, undefined, specialty);
      }
      if (!profile?.specialty?.trim()) {
        return "/onboarding?portal=psychologist";
      }
      if (isPsychologistSpecialty(profile.specialty)) {
        return PSYCHOLOGIST_HOME;
      }
    } else if (callbackUrl) {
      return safePostLoginUrl("PROFESSIONAL", callbackUrl);
    }
    throw new Error("not_psychologist");
  }

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

      if (role !== "PROFESSIONAL") {
        setError("psychologistOnly");
        setLoading(false);
        return;
      }

      try {
        const dest = await resolvePsychologistDestination();
        router.push(dest);
      } catch {
        setError("psychologistOnly");
        setLoading(false);
        return;
      }
      router.refresh();
    } catch {
      setError("generic");
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError("");
    persistAuthCallback(callbackUrl || PSYCHOLOGIST_HOME);
    try {
      await signIn("google", { callbackUrl: "/callback?portal=psychologist" });
    } catch {
      setError("generic");
      setGoogleLoading(false);
    }
  }

  return (
    <LoginPageShell accent="violet">
      <LoginLanguageSelector lang={lang} onChange={changeLang} accent="violet" />
      <LoginHeader
        tagline={t("login.psychologistTagline")}
        accent="violet"
        variant="psychologist"
      />

      <LoginCard>
        <LoginAlerts
          error={error}
          verified={verified}
          unverifiedEmail={unverifiedEmail}
          t={t}
        />

        <GoogleSignInButton
          loading={googleLoading}
          disabled={googleLoading || loading}
          onClick={handleGoogleSignIn}
          t={t}
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
            {t("login.noAccount")}{" "}
            <Link href={registerHref} className="text-violet-400 hover:text-violet-300 font-medium transition">
              {t("login.createAccount")}
            </Link>
          </p>
          <Link
            href={mainLoginHref}
            className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 transition"
          >
            <ArrowLeft size={12} aria-hidden />
            {t("login.backToMain")}
          </Link>
        </div>
      </LoginCard>
    </LoginPageShell>
  );
}

export default function PsychologistLoginPage() {
  return (
    <Suspense fallback={<LoginSuspenseFallback accent="violet" />}>
      <PsychologistLoginForm />
    </Suspense>
  );
}
