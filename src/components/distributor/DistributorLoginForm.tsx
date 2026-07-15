"use client";

import { useState, useEffect } from "react";
import { signIn, signOut } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Package } from "lucide-react";
import { persistAuthCallback, consumeAuthCallback, resolveClientAuthCallback } from "@/lib/auth-callback";
import { clearSensitiveClientState } from "@/lib/logout-cleanup";
import { safePostLoginUrl } from "@/lib/role-home";
import { buildForgotPasswordHref } from "@/lib/auth-portals";
import { canAccessDistributorPortal } from "@/lib/distributor-auth";
import {
  DISTRIBUTOR_HOME,
  DISTRIBUTOR_LOGIN,
  DISTRIBUTOR_REGISTER,
} from "@/lib/distributor-portal";
import {
  useLoginLang,
  parseLoginError,
  resolveCredentialSignInError,
  LoginPageShell,
  LoginLanguageSelector,
  LoginCard,
  LoginAlerts,
  LoginCredentialsForm,
  navigateAfterAuth,
  waitForAuthenticatedSession,
  type LoginErrorCode,
} from "@/components/auth/login-shared";

const POST_LOGIN_CALLBACK = "/callback";

export default function DistributorLoginForm() {
  const searchParams = useSearchParams();
  const queryCallback = searchParams.get("callbackUrl") || "";
  const { callback: callbackUrl } = resolveClientAuthCallback(queryCallback || DISTRIBUTOR_HOME);
  const { lang, changeLang, t } = useLoginLang(callbackUrl);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<LoginErrorCode>("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  const verified = searchParams.get("verified") === "true";
  const passwordReset = searchParams.get("reset") === "success";
  const registered = searchParams.get("registered") === "1";

  const forgotHref = buildForgotPasswordHref({
    email: email.trim() || undefined,
    from: DISTRIBUTOR_LOGIN,
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
        callbackUrl: callbackUrl || DISTRIBUTOR_HOME,
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
        if (!canAccessDistributorPortal(session.user.role)) {
          setError("invalid");
          setLoading(false);
          await signOut({ redirect: false });
          return;
        }
        const savedCallback = consumeAuthCallback();
        const destination = safePostLoginUrl(
          session.user.role,
          savedCallback || callbackUrl || DISTRIBUTOR_HOME,
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

  return (
    <LoginPageShell accent="sky">
      <LoginLanguageSelector lang={lang} onChange={changeLang} accent="sky" />

      <div className="mb-6 text-center">
        <div className="mb-2 inline-flex items-center gap-2 text-sky-300">
          <Package size={22} />
          <span className="text-lg font-semibold">Doctor8 Distributors</span>
        </div>
        <p className="text-sm text-slate-400">US supplier portal — Zephra & partners</p>
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
          verifyFrom={DISTRIBUTOR_LOGIN}
          callbackUrl={callbackUrl || undefined}
        />

        <LoginCredentialsForm
          email={email}
          password={password}
          showPassword={showPassword}
          loading={loading}
          googleLoading={false}
          accent="sky"
          forgotHref={forgotHref}
          t={t}
          onEmailChange={setEmail}
          onPasswordChange={setPassword}
          onTogglePassword={() => setShowPassword((v) => !v)}
          onSubmit={handleSubmit}
          onClearError={() => { if (error && error !== "unverified") setError(""); }}
        />

        <div className="mt-6 space-y-3 border-t border-white/10 pt-6 text-center">
          <p className="text-sm text-slate-400">
            {t("login.noAccount")}{" "}
            <Link href={DISTRIBUTOR_REGISTER} className="font-medium text-sky-400 hover:text-sky-300">
              Register distributor
            </Link>
          </p>
          <Link href="/distribuidores" className="text-xs text-slate-500 transition hover:text-slate-300">
            ← Back to doctor8.org/distribuidores
          </Link>
        </div>
      </LoginCard>
    </LoginPageShell>
  );
}
