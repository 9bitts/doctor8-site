"use client";

// src/app/(auth)/verify-email/page.tsx
// Shown after registration — tells user to check their email

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Mail, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get("email") || "";
  const errorParam = searchParams.get("error");

  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sent" | "error">("idle");
  const [countdown, setCountdown] = useState(0);

  // Expired token: auto-trigger resend on mount
  const isExpired = errorParam === "expired";

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  async function handleResend() {
    if (!emailParam || countdown > 0) return;
    setResendLoading(true);
    setResendStatus("idle");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: emailParam }),
      });

      if (res.ok) {
        setResendStatus("sent");
        setCountdown(60); // 60s cooldown
      } else {
        setResendStatus("error");
      }
    } catch {
      setResendStatus("error");
    } finally {
      setResendLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Doctor<span className="text-emerald-400">8</span>
          </h1>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">

          {/* Icon */}
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-emerald-400" />
          </div>

          {isExpired ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-3">Link expired</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                Your verification link has expired. Click below to receive a new one.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-3">Check your email</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-2">
                We sent a verification link to:
              </p>
              {emailParam && (
                <p className="text-emerald-400 font-semibold text-sm mb-6 break-all">
                  {emailParam}
                </p>
              )}
              <p className="text-slate-500 text-xs mb-6">
                Click the link in the email to verify your account.
                The link expires in 24 hours.
              </p>
            </>
          )}

          {/* Resend status */}
          {resendStatus === "sent" && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4 text-left">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-emerald-300 text-sm">New verification email sent!</p>
            </div>
          )}

          {resendStatus === "error" && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-left">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">Failed to send email. Please try again.</p>
            </div>
          )}

          {/* Resend button */}
          {emailParam && (
            <button
              onClick={handleResend}
              disabled={resendLoading || countdown > 0}
              className="w-full flex items-center justify-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition mb-4"
            >
              {resendLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              {countdown > 0
                ? `Resend in ${countdown}s`
                : resendStatus === "sent"
                ? "Resend again"
                : "Resend verification email"}
            </button>
          )}

          <div className="border-t border-white/10 pt-4">
            <p className="text-slate-500 text-xs mb-3">
              Wrong email address?
            </p>
            <Link
              href="/register"
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition"
            >
              Back to registration
            </Link>
            <span className="text-slate-600 mx-3">·</span>
            <Link
              href="/login"
              className="text-slate-400 hover:text-slate-300 text-sm transition"
            >
              Sign in
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
