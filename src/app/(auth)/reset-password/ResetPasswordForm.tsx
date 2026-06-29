"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";
import { Lang, translate } from "@/lib/i18n/translations";
import {
  MAIN_LOGIN,
  buildForgotPasswordHref,
  buildLoginHref,
  type LoginAccent,
} from "@/lib/auth-portals";
import { ForgotPasswordLayout } from "@/components/auth/forgot-password-shared";

export default function ResetPasswordForm({
  token,
  lang,
  loginPath = MAIN_LOGIN,
  accent = "emerald",
}: {
  token: string;
  lang: Lang;
  loginPath?: string;
  accent?: LoginAccent;
}) {
  const router = useRouter();
  const t = (key: string) => translate(lang, key);

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const rules = [
    { ok: password.length >= 8, label: t("reset.rule8") },
    { ok: /[A-Z]/.test(password), label: t("reset.ruleUpper") },
    { ok: /[0-9]/.test(password), label: t("reset.ruleNumber") },
    { ok: /[^A-Za-z0-9]/.test(password), label: t("reset.ruleSpecial") },
    { ok: password === confirm && confirm.length > 0, label: t("reset.ruleMatch") },
  ];
  const valid = rules.every((r) => r.ok);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const d = await res.json();
      if (!res.ok) {
        setError(d.error === "expired" ? t("reset.errorExpired") : t("reset.errorInvalid"));
        return;
      }
      setDone(true);
      setTimeout(
        () => router.push(buildLoginHref(loginPath, { resetSuccess: true })),
        3000,
      );
    } catch {
      setError(t("reset.errorGeneric"));
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <ForgotPasswordLayout accent={accent}>
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">{t("reset.doneTitle")}</h2>
          <p className="text-slate-400 text-sm">{t("reset.doneSubtitle")}</p>
        </div>
      </ForgotPasswordLayout>
    );
  }

  return (
    <ForgotPasswordLayout accent={accent}>
      <h2 className="text-xl font-bold text-white mb-2">{t("reset.title")}</h2>
      <p className="text-slate-400 text-sm mb-6">{t("reset.subtitle")}</p>
      {error && (
        <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3" role="alert">
          {error}
        </p>
      )}
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {t("reset.newPassword")}
          </label>
          <div className="relative">
            <input
              type={show ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
            />
            <button
              type="button"
              onClick={() => setShow(!show)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
              aria-label={show ? t("login.hidePassword") : t("login.showPassword")}
            >
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-2">
            {t("reset.confirmPassword")}
          </label>
          <input
            type={show ? "text" : "password"}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            autoComplete="new-password"
            className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
          />
        </div>
        {password && (
          <div className="bg-white/5 rounded-xl p-3 space-y-1.5">
            {rules.map((r) => (
              <div key={r.label} className="flex items-center gap-2">
                <CheckCircle2 size={13} className={r.ok ? "text-emerald-400" : "text-slate-600"} />
                <span className={`text-xs ${r.ok ? "text-emerald-400" : "text-slate-500"}`}>
                  {r.label}
                </span>
              </div>
            ))}
          </div>
        )}
        <button
          type="submit"
          disabled={loading || !valid}
          className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
        >
          {loading && <Loader2 size={16} className="animate-spin" />}
          {loading ? t("reset.updating") : t("reset.submit")}
        </button>
      </form>
    </ForgotPasswordLayout>
  );
}

export function ResetPasswordMessage({
  lang,
  variant,
  accent = "emerald",
  loginPath = MAIN_LOGIN,
}: {
  lang: Lang;
  variant: "missing" | "invalid" | "expired";
  accent?: LoginAccent;
  loginPath?: string;
}) {
  const t = (key: string) => translate(lang, key);
  const title =
    variant === "expired" ? t("reset.expiredTitle") : t("reset.invalidTitle");
  const body =
    variant === "expired" ? t("reset.expiredBody") : t("reset.invalidBody");

  return (
    <ForgotPasswordLayout accent={accent}>
      <div className="text-center">
        <h2 className="text-xl font-bold text-white mb-3">{title}</h2>
        <p className="text-slate-400 text-sm mb-6 leading-relaxed">{body}</p>
        <Link
          href={buildForgotPasswordHref({ from: loginPath })}
          className="inline-block bg-emerald-500 hover:bg-emerald-400 text-white font-semibold px-6 py-3 rounded-xl transition"
        >
          {t("reset.requestNew")}
        </Link>
      </div>
    </ForgotPasswordLayout>
  );
}
