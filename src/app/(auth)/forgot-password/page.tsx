"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, Mail } from "lucide-react";
import {
  buildForgotPasswordHref,
  resolveForgotPasswordContext,
} from "@/lib/auth-portals";
import {
  useLoginLang,
  getLoginAccentStyles,
} from "@/components/auth/login-shared";
import {
  ForgotPasswordLayout,
  ForgotPasswordSuspenseFallback,
} from "@/components/auth/forgot-password-shared";

function ForgotPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { t } = useLoginLang();
  const from = searchParams.get("from");
  const { loginPath, accent } = resolveForgotPasswordContext(from);
  const styles = getLoginAccentStyles(accent);

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const prefill = searchParams.get("email");
    if (prefill) setEmail(prefill);
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setLoading(true);
    setError("");
    try {
      router.push(buildForgotPasswordHref({
        email: email.trim().toLowerCase(),
        from: loginPath,
      }));
    } catch {
      setError(t("forgot.error"));
      setLoading(false);
    }
  }

  return (
    <ForgotPasswordLayout accent={accent}>
      <Link
        href={loginPath}
        className={`inline-flex items-center gap-2 ${styles.link} text-sm mb-6 transition`}
      >
        <ArrowLeft size={16} aria-hidden />
        {t("forgot.backLogin")}
      </Link>

      <h2 className="text-xl font-bold text-white mb-2">{t("forgot.title")}</h2>
      <p className="text-slate-400 text-sm mb-6">{t("forgot.subtitle")}</p>

      {error && (
        <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3" role="alert">
          {error}
        </p>
      )}

      <form onSubmit={handleSubmit} className="space-y-4" noValidate>
        <div>
          <label htmlFor="forgot-email" className="block text-sm font-medium text-slate-300 mb-2">
            {t("login.email")}
          </label>
          <div className="relative">
            <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" aria-hidden />
            <input
              id="forgot-email"
              type="email"
              required
              autoFocus
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={t("login.emailPlaceholder")}
              autoComplete="email"
              className={`w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 ${styles.ring} transition`}
            />
          </div>
        </div>
        <button
          type="submit"
          disabled={loading}
          className={`w-full ${styles.btn} disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2`}
        >
          {loading && <Loader2 size={16} className="animate-spin" aria-hidden />}
          {t("forgot.continue")}
        </button>
      </form>
    </ForgotPasswordLayout>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense fallback={<ForgotPasswordSuspenseFallback />}>
      <ForgotPasswordForm />
    </Suspense>
  );
}
