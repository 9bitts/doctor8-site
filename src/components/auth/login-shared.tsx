"use client";

import { useState, useEffect, useId } from "react";
import Link from "next/link";
import { getSession } from "next-auth/react";
import { translate, LANGUAGES, Lang } from "@/lib/i18n/translations";
import { detectInitialLang, LANG_KEY } from "@/components/auth/register-shared";
import { clearForeignUserState } from "@/lib/logout-cleanup";
import {
  Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Mail, Brain, Leaf, Building2, Heart,
} from "lucide-react";
import type { LoginAccent, PortalHeaderIcon } from "@/lib/auth-portals";
import { buildVerifyAccountHref, MAIN_LOGIN } from "@/lib/auth-portals";
import {
  ACCENT_BTN,
  ACCENT_LANG,
  ACCENT_LINK,
  ACCENT_RING,
  GRADIENT,
  HEADER_ICON_COLOR,
  HEADER_ICON_WRAP,
  getLoginAccentStyles,
} from "@/lib/auth/login-accent-styles";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { isHumanitarianContext } from "@/lib/humanitarian/feature-flags";
import { readClientHumOriginFlag } from "@/lib/humanitarian/origin-cookie";

export type { LoginAccent };
export { getLoginAccentStyles };

export type LoginErrorCode =
  | ""
  | "unverified"
  | "locked"
  | "invalid"
  | "invalidLink"
  | "verificationFailed"
  | "generic"
  | "psychologistOnly"
  | "roleOnly";

const HEADER_ICONS: Record<PortalHeaderIcon, typeof Brain> = {
  brain: Brain,
  leaf: Leaf,
  building: Building2,
  heart: Heart,
};

export function isHumanitarianAuthCallback(callbackUrl: string | null | undefined): boolean {
  if (typeof window !== "undefined" && readClientHumOriginFlag()) return true;
  return isHumanitarianContext(callbackUrl);
}

export function useLoginLang(callbackUrl?: string | null) {
  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => {
    let initial = detectInitialLang();
    const cb =
      callbackUrl
      ?? (typeof window !== "undefined"
        ? new URLSearchParams(window.location.search).get("callbackUrl")
        : null);
    if (isHumanitarianAuthCallback(cb)) {
      try {
        const saved = window.localStorage.getItem(LANG_KEY);
        if (!saved) initial = "es";
      } catch {
        initial = "es";
      }
    }
    setLang(initial);
  }, [callbackUrl]);

  function changeLang(l: Lang) {
    setLang(l);
    try { window.localStorage.setItem(LANG_KEY, l); } catch { /* ignore */ }
  }

  const t = (key: string) => translate(lang, key);
  return { lang, changeLang, t };
}

/** Build an internal auth path preserving callbackUrl / registerUrl. */
export function buildAuthHref(
  path: string,
  params?: { callbackUrl?: string; registerUrl?: string },
): string {
  const sp = new URLSearchParams();
  if (params?.callbackUrl) sp.set("callbackUrl", params.callbackUrl);
  if (params?.registerUrl) sp.set("registerUrl", params.registerUrl);
  const qs = sp.toString();
  return qs ? `${path}?${qs}` : path;
}

function sessionHasRole(
  session: Awaited<ReturnType<typeof getSession>> | null | undefined,
): session is NonNullable<Awaited<ReturnType<typeof getSession>>> & {
  user: { id: string; role: string };
} {
  return Boolean(session?.user?.id && session.user.role);
}

/** Wait until Auth.js session cookie matches the account that just signed in. */
export async function waitForAuthenticatedSession(
  opts?: {
    expectedEmail?: string;
    maxAttempts?: number;
    delayMs?: number;
  },
): Promise<Awaited<ReturnType<typeof getSession>>> {
  const expectedEmail = opts?.expectedEmail?.trim().toLowerCase();
  const maxAttempts = opts?.maxAttempts ?? 75;
  const delayMs = opts?.delayMs ?? 200;

  function matchesExpected(session: Awaited<ReturnType<typeof getSession>>): boolean {
    if (!sessionHasRole(session)) return false;
    if (!expectedEmail) return true;
    return (session.user.email ?? "").trim().toLowerCase() === expectedEmail;
  }

  for (let i = 0; i < maxAttempts; i++) {
    try {
      const fromClient = await getSession();
      if (matchesExpected(fromClient)) {
        clearForeignUserState(fromClient!.user.id);
        return fromClient;
      }

      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8_000);
      try {
        const res = await fetch("/api/auth/session", {
          cache: "no-store",
          credentials: "same-origin",
          signal: controller.signal,
        });
        if (res.ok) {
          const session = await res.json();
          if (matchesExpected(session)) {
            clearForeignUserState(session.user.id);
            return session;
          }
        }
      } finally {
        clearTimeout(timer);
      }
    } catch {
      /* retry */
    }
    await new Promise((resolve) => setTimeout(resolve, delayMs));
  }
  return null;
}

/** Full navigation so middleware sees the fresh session cookie. */
export function navigateAfterAuth(destination: string) {
  window.location.assign(destination);
}

export function parseLoginError(err: string | null): LoginErrorCode {
  if (!err) return "";
  if (err === "EmailNotVerified") return "unverified";
  if (err === "AccountLocked") return "locked";
  if (err === "InvalidVerificationLink") return "invalidLink";
  if (err === "VerificationFailed") return "verificationFailed";
  if (err === "WrongRole" || err === "AccessDenied") return "roleOnly";
  if (err === "SessionTimeout") return "generic";
  return "invalid";
}

export function LoginPageShell({
  accent,
  children,
}: {
  accent: LoginAccent;
  children: React.ReactNode;
}) {
  return (
    <div className={`min-h-screen bg-gradient-to-br ${GRADIENT[accent]} flex items-center justify-center p-4`}>
      <div className="w-full max-w-md">{children}</div>
    </div>
  );
}

export function LoginLanguageSelector({
  lang,
  onChange,
  accent,
}: {
  lang: Lang;
  onChange: (l: Lang) => void;
  accent: LoginAccent;
}) {
  return (
    <div className="flex justify-end mb-4">
      <div
        className="inline-flex items-center gap-1 bg-white/5 border border-white/10 rounded-full p-1"
        role="group"
        aria-label="Language"
      >
        {LANGUAGES.map((l) => (
          <button
            key={l.code}
            type="button"
            onClick={() => onChange(l.code)}
            className={`px-3 py-1.5 rounded-full text-xs font-semibold transition flex items-center gap-1.5 ${
              lang === l.code ? ACCENT_LANG[accent] : "text-slate-300 hover:text-white hover:bg-white/10"
            }`}
            aria-pressed={lang === l.code}
            aria-label={l.label}
          >
            <span>{l.flag}</span>
            <span className="uppercase">{l.code}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

export function LoginHeader({
  tagline,
  accent,
  icon,
}: {
  tagline?: string;
  accent: LoginAccent;
  icon?: PortalHeaderIcon;
}) {
  const Icon = icon ? HEADER_ICONS[icon] : null;
  return (
    <div className="text-center mb-8">
      {Icon && (
        <div className={`inline-flex items-center justify-center w-14 h-14 rounded-2xl border mb-4 ${HEADER_ICON_WRAP[accent]}`}>
          <Icon className={`w-7 h-7 ${HEADER_ICON_COLOR[accent]}`} aria-hidden />
        </div>
      )}
      <BrandLogo variant="on-dark" size="md" className="mx-auto" />
      {tagline ? <p className="text-slate-300 mt-3 text-sm leading-relaxed">{tagline}</p> : null}
    </div>
  );
}

export function LoginCard({ children }: { children: React.ReactNode }) {
  return (
    <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
      {children}
    </div>
  );
}

export function LoginAlerts({
  error,
  verified,
  passwordReset,
  unverifiedEmail,
  t,
  roleOnlyKey,
  verifyFrom,
  callbackUrl,
}: {
  error: LoginErrorCode;
  verified: boolean;
  passwordReset?: boolean;
  unverifiedEmail: string;
  t: (key: string) => string;
  roleOnlyKey?: string;
  verifyFrom?: string;
  callbackUrl?: string;
}) {
  return (
    <>
      {passwordReset && (
        <div
          className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6"
          role="status"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" aria-hidden />
          <p className="text-emerald-300 text-sm">{t("login.passwordResetSuccess")}</p>
        </div>
      )}

      {verified && (
        <div
          className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6"
          role="status"
        >
          <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" aria-hidden />
          <p className="text-emerald-300 text-sm">{t("login.verified")}</p>
        </div>
      )}

      {(error === "roleOnly" || error === "psychologistOnly") && (
        <div className="flex items-start gap-3 bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6" role="alert">
          <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" aria-hidden />
          <p className="text-amber-300 text-sm">
            {t(roleOnlyKey || "login.psychologistOnly")}
          </p>
        </div>
      )}

      {error === "unverified" && (
        <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6" role="alert">
          <div className="flex items-start gap-3 mb-3">
            <Mail className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" aria-hidden />
            <div>
              <p className="text-amber-300 text-sm font-medium">{t("login.unverifiedTitle")}</p>
              <p className="text-amber-400/80 text-xs mt-1">{t("login.unverifiedText")}</p>
            </div>
          </div>
          {unverifiedEmail && (
            <Link
              href={buildVerifyAccountHref({
                email: unverifiedEmail,
                callbackUrl: callbackUrl || undefined,
                from: verifyFrom || MAIN_LOGIN,
              })}
              className="text-xs text-amber-300 hover:text-amber-200 underline"
            >
              {t("login.resend")}
            </Link>
          )}
        </div>
      )}

      {error === "locked" && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6" role="alert">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" aria-hidden />
          <p className="text-red-300 text-sm">{t("login.locked")}</p>
        </div>
      )}

      {(error === "invalid" || error === "invalidLink" || error === "verificationFailed" || error === "generic") && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6" role="alert">
          <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" aria-hidden />
          <p className="text-red-300 text-sm">
            {error === "invalid" ? t("login.invalid")
              : error === "invalidLink" ? t("login.invalidLink")
              : error === "verificationFailed" ? t("login.verificationFailed")
              : t("login.genericError")}
          </p>
        </div>
      )}
    </>
  );
}

export function GoogleSignInButton({
  loading,
  disabled,
  onClick,
  t,
  labelKey = "login.continueGoogle",
}: {
  loading: boolean;
  disabled: boolean;
  onClick: () => void;
  t: (key: string) => string;
  labelKey?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 font-semibold py-3 rounded-xl transition mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
    >
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin text-slate-600" aria-hidden />
      ) : (
        <svg className="w-5 h-5" viewBox="0 0 24 24" aria-hidden>
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      )}
      {t(labelKey)}
    </button>
  );
}

export function LoginDivider({ t }: { t: (key: string) => string }) {
  return (
    <div className="flex items-center gap-4 mb-4" aria-hidden>
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-slate-500 text-xs uppercase tracking-wider">{t("login.or")}</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  );
}

export function LoginCredentialsForm({
  email,
  password,
  showPassword,
  loading,
  googleLoading,
  accent,
  forgotHref,
  t,
  onEmailChange,
  onPasswordChange,
  onTogglePassword,
  onSubmit,
  onClearError,
  autoFocusEmail = true,
}: {
  email: string;
  password: string;
  showPassword: boolean;
  loading: boolean;
  googleLoading: boolean;
  accent: LoginAccent;
  forgotHref: string;
  t: (key: string) => string;
  onEmailChange: (v: string) => void;
  onPasswordChange: (v: string) => void;
  onTogglePassword: () => void;
  onSubmit: (e: React.FormEvent) => void;
  onClearError?: () => void;
  autoFocusEmail?: boolean;
}) {
  const emailId = useId();
  const passwordId = useId();
  const ring = ACCENT_RING[accent];
  const btn = ACCENT_BTN[accent];
  const link = ACCENT_LINK[accent];

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div>
        <label htmlFor={emailId} className="block text-sm font-medium text-slate-300 mb-2">
          {t("login.email")}
        </label>
        <input
          id={emailId}
          type="email"
          value={email}
          onChange={(e) => { onEmailChange(e.target.value); onClearError?.(); }}
          required
          autoComplete="email"
          autoFocus={autoFocusEmail}
          placeholder={t("login.emailPlaceholder")}
          className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 ${ring} transition`}
        />
      </div>

      <div>
        <label htmlFor={passwordId} className="block text-sm font-medium text-slate-300 mb-2">
          {t("login.password")}
        </label>
        <div className="relative">
          <input
            id={passwordId}
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => { onPasswordChange(e.target.value); onClearError?.(); }}
            required
            autoComplete="current-password"
            placeholder={t("login.passwordPlaceholder")}
            className={`w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 ${ring} transition`}
          />
          <button
            type="button"
            onClick={onTogglePassword}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
            aria-label={showPassword ? t("login.hidePassword") : t("login.showPassword")}
          >
            {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
          </button>
        </div>
      </div>

      <div className="flex justify-end">
        <Link href={forgotHref} className={`text-sm ${link} transition`}>
          {t("login.forgot")}
        </Link>
      </div>

      <button
        type="submit"
        disabled={loading || googleLoading}
        className={`w-full ${btn} disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2`}
      >
        {loading && <Loader2 className="w-4 h-4 animate-spin" aria-hidden />}
        {loading ? t("login.signingIn") : t("login.signIn")}
      </button>
    </form>
  );
}

export function LoginSuspenseFallback({ accent = "emerald" }: { accent?: LoginAccent }) {
  return (
    <LoginPageShell accent={accent}>
      <div className="flex items-center justify-center py-24">
        <Loader2 className="w-8 h-8 text-white/60 animate-spin" aria-label="Loading" />
      </div>
    </LoginPageShell>
  );
}
