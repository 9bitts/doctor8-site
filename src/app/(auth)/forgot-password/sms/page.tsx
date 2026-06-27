"use client";

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Smartphone, Loader2, AlertCircle, CheckCircle2, ArrowLeft, Eye, EyeOff,
} from "lucide-react";
import { Lang, normalizeLang, translate } from "@/lib/i18n/translations";

const LANG_KEY = "doctor8.lang";

function detectLang(): Lang {
  if (typeof window === "undefined") return "en";
  try {
    const saved = window.localStorage.getItem(LANG_KEY);
    if (saved) return normalizeLang(saved);
  } catch { /* ignore */ }
  const nav = (navigator.language || "en").toLowerCase();
  if (nav.startsWith("pt")) return "pt";
  if (nav.startsWith("es")) return "es";
  return "en";
}

function ForgotPasswordSmsContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const email = searchParams.get("email") || "";

  const [lang, setLang] = useState<Lang>("en");
  useEffect(() => { setLang(detectLang()); }, []);
  const t = (key: string) => translate(lang, key);

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [codeSent, setCodeSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState(0);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  const rules = [
    { ok: password.length >= 8, label: t("reset.rule8") },
    { ok: /[A-Z]/.test(password), label: t("reset.ruleUpper") },
    { ok: /[0-9]/.test(password), label: t("reset.ruleNumber") },
    { ok: /[^A-Za-z0-9]/.test(password), label: t("reset.ruleSpecial") },
    { ok: password === confirm && confirm.length > 0, label: t("reset.ruleMatch") },
  ];
  const passwordValid = rules.every((r) => r.ok);

  const methodHref = email
    ? `/forgot-password/method?email=${encodeURIComponent(email)}`
    : "/forgot-password";

  async function handleSendCode() {
    if (!email || !phone.trim() || countdown > 0) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/forgot-password-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone }),
      });
      const data = await res.json();
      if (res.ok) {
        setCodeSent(true);
        setCountdown(60);
        return;
      }
      if (data.error === "RATE_LIMITED") setError("rateLimited");
      else if (data.error === "INVALID_PHONE") setError("invalidPhone");
      else if (data.error === "NO_ACCOUNT") setError("noAccount");
      else if (data.error === "SNS_SANDBOX") setError("snsSandbox");
      else setError("sendFailed");
    } catch {
      setError("sendFailed");
    } finally {
      setLoading(false);
    }
  }

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    if (!passwordValid || code.length < 6) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/auth/reset-password-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, phone, code, password }),
      });
      const data = await res.json();
      if (res.ok) {
        router.push("/login?reset=success");
        return;
      }
      if (data.error === "EXPIRED") setError("expired");
      else if (data.error === "TOO_MANY_ATTEMPTS") setError("tooMany");
      else if (data.error === "INVALID_CODE") setError("invalidCode");
      else if (data.error === "WEAK_PASSWORD") setError("weakPassword");
      else setError("resetFailed");
    } catch {
      setError("resetFailed");
    } finally {
      setLoading(false);
    }
  }

  if (!email) {
    return (
      <Shell>
        <Link href="/forgot-password" className="text-emerald-400 text-sm underline">
          {t("forgot.enterEmail")}
        </Link>
      </Shell>
    );
  }

  return (
    <Shell>
      <Link href={methodHref} className="inline-flex items-center gap-1.5 text-slate-400 hover:text-white text-sm mb-6">
        <ArrowLeft className="w-4 h-4" />
        {t("forgot.backMethods")}
      </Link>

      <div className="w-14 h-14 bg-blue-500/10 border border-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
        <Smartphone className="w-7 h-7 text-blue-400" />
      </div>
      <h2 className="text-xl font-bold text-white text-center mb-2">{t("forgot.smsTitle")}</h2>
      <p className="text-slate-400 text-sm text-center mb-6">{t("forgot.smsSubtitle")}</p>

      {error && (
        <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4">
          <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
          <p className="text-red-300 text-sm">{t(`forgot.smsError.${error}`)}</p>
        </div>
      )}

      {!codeSent ? (
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t("verifySms.phoneLabel")}
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder={t("verifySms.phonePlaceholder")}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <button
            type="button"
            onClick={handleSendCode}
            disabled={loading || !phone.trim() || countdown > 0}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {countdown > 0
              ? t("verifySms.resendIn").replace("{{s}}", String(countdown))
              : t("forgot.sendSmsCode")}
          </button>
        </div>
      ) : (
        <form onSubmit={handleReset} className="space-y-4">
          <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <p className="text-emerald-300 text-sm">{t("forgot.codeSent")}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t("verifySms.codeLabel")}
            </label>
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-center text-2xl tracking-[0.3em] font-mono focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">
              {t("reset.newPassword")}
            </label>
            <div className="relative">
              <input
                type={show ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="new-password"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
              <button
                type="button"
                onClick={() => setShow(!show)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400"
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
              autoComplete="new-password"
              className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
            />
          </div>
          {password && (
            <div className="bg-white/5 rounded-xl p-3 space-y-1">
              {rules.map((r) => (
                <div key={r.label} className="flex items-center gap-2">
                  <CheckCircle2 size={12} className={r.ok ? "text-emerald-400" : "text-slate-600"} />
                  <span className={`text-xs ${r.ok ? "text-emerald-400" : "text-slate-500"}`}>
                    {r.label}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !passwordValid || code.length < 6}
            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {t("forgot.resetWithSms")}
          </button>
        </form>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white">
            Doctor<span className="text-emerald-400">8</span>
          </h1>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function ForgotPasswordSmsPage() {
  return (
    <Suspense>
      <ForgotPasswordSmsContent />
    </Suspense>
  );
}
