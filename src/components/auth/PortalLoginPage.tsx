"use client";

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { persistAuthCallback, resolveRegisterHref } from "@/lib/auth-callback";
import {
  MAIN_LOGIN,
  PORTAL_BY_ID,
  buildForgotPasswordHref,
  type PortalId,
  type PortalLoginConfig,
} from "@/lib/auth-portals";
import {
  isPsychologistSpecialty,
  PSYCHOLOGIST_HOME,
} from "@/lib/psychologist-portal";
import { resolveRoleHome, safePostLoginUrl } from "@/lib/role-home";
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

async function resolvePsychologistLoginDestination(
  callbackUrl: string,
): Promise<string> {
  const profRes = await fetch("/api/professional/profile");
  if (profRes.ok) {
    const { profile } = await profRes.json();
    const specialty = profile?.specialty ?? null;
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

async function resolvePortalLoginDestination(
  config: PortalLoginConfig,
  session: { role?: string; professionalSpecialty?: string | null },
  callbackUrl: string,
): Promise<string> {
  if (config.id === "psychologist") {
    return resolvePsychologistLoginDestination(callbackUrl);
  }
  const role = session.role;
  if (callbackUrl) {
    return safePostLoginUrl(
      role,
      callbackUrl,
      undefined,
      session.professionalSpecialty,
    );
  }
  return resolveRoleHome(role, session.professionalSpecialty) || config.homePath;
}

function PortalLoginForm({ portalId }: { portalId: PortalId }) {
  const config = PORTAL_BY_ID[portalId];
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
    searchParams.get("registerUrl") || config.defaultRegisterPath,
    callbackUrl || null,
  );
  const mainLoginHref = buildAuthHref(MAIN_LOGIN, { callbackUrl });
  const forgotHref = buildForgotPasswordHref({
    email: email.trim() || undefined,
    from: config.loginPath,
  });

  useEffect(() => {
    setError(parseLoginError(searchParams.get("error")));
  }, [searchParams]);

  async function finishLogin(session: {
    role?: string;
    professionalSpecialty?: string | null;
  }) {
    const role = session.role;
    if (!role || !config.allowedRoles.includes(role)) {
      setError("roleOnly");
      setLoading(false);
      return;
    }

    try {
      const dest = await resolvePortalLoginDestination(config, session, callbackUrl);
      router.push(dest);
      router.refresh();
    } catch {
      setError("roleOnly");
      setLoading(false);
    }
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
      await finishLogin(session?.user ?? {});
    } catch {
      setError("generic");
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError("");
    persistAuthCallback(callbackUrl || config.homePath);
    try {
      await signIn("google", {
        callbackUrl: `/callback?portal=${encodeURIComponent(config.oauthPortal)}`,
      });
    } catch {
      setError("generic");
      setGoogleLoading(false);
    }
  }

  const linkClass = config.footerLinkClass;

  return (
    <LoginPageShell accent={config.accent}>
      <LoginLanguageSelector lang={lang} onChange={changeLang} accent={config.accent} />
      <LoginHeader
        tagline={t(config.taglineKey)}
        accent={config.accent}
        icon={config.headerIcon}
      />

      <LoginCard>
        <LoginAlerts
          error={error}
          verified={verified}
          unverifiedEmail={unverifiedEmail}
          t={t}
          roleOnlyKey={config.roleOnlyKey}
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
          accent={config.accent}
          forgotHref={forgotHref}
          t={t}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onTogglePassword={() => setShowPassword(!showPassword)}
          onSubmit={handleSubmit}
          onClearError={() => { if (error && error !== "unverified") setError(""); }}
        />

        <div className="border-t border-white/10 mt-6 pt-6 text-center space-y-3">
          <p className="text-slate-400 text-sm">
            {t("login.noAccount")}{" "}
            <Link href={registerHref} className={`${linkClass} font-medium transition`}>
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

export default function PortalLoginPage({ portalId }: { portalId: PortalId }) {
  const accent = PORTAL_BY_ID[portalId].accent;
  return (
    <Suspense fallback={<LoginSuspenseFallback accent={accent} />}>
      <PortalLoginForm portalId={portalId} />
    </Suspense>
  );
}
