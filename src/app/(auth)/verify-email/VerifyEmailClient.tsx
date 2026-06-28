"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { Mail, RefreshCw, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

type Props = {
  email: string;
  error?: string;
  callbackUrl?: string;
};

export default function VerifyEmailClient({ email, error, callbackUrl = "" }: Props) {
  const loginHref = callbackUrl
    ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}`
    : "/login";

  const [resendLoading, setResendLoading] = useState(false);
  const [resendStatus, setResendStatus] = useState<"idle" | "sent" | "error">("idle");
  const [countdown, setCountdown] = useState(0);

  const isExpired = error === "expired";

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown((c) => c - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [countdown]);

  async function handleResend() {
    if (!email || countdown > 0) return;
    setResendLoading(true);
    setResendStatus("idle");

    try {
      const res = await fetch("/api/auth/resend-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (res.ok) {
        setResendStatus("sent");
        setCountdown(60);
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
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Doctor<span className="text-emerald-400">8</span>
          </h1>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">
          <div className="w-20 h-20 bg-emerald-500/10 border border-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
            <Mail className="w-10 h-10 text-emerald-400" />
          </div>

          {isExpired ? (
            <>
              <h2 className="text-2xl font-bold text-white mb-3">Link expirado</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-6">
                O link de verifica{"\u00e7\u00e3o"} expirou. Clique abaixo para receber um novo e-mail.
              </p>
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold text-white mb-3">Verifique seu e-mail</h2>
              <p className="text-slate-400 text-sm leading-relaxed mb-2">
                Enviamos um link de verifica{"\u00e7\u00e3o"} para:
              </p>
              {email && (
                <p className="text-emerald-400 font-semibold text-sm mb-6 break-all">{email}</p>
              )}
              <p className="text-slate-500 text-xs mb-6">
                Clique no link do e-mail para ativar sua conta. O link expira em 24 horas.
              </p>
            </>
          )}

          {resendStatus === "sent" && (
            <div className="flex items-center gap-2 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-3 mb-4 text-left">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <p className="text-emerald-300 text-sm">
                Novo e-mail de verifica{"\u00e7\u00e3o"} enviado!
              </p>
            </div>
          )}

          {resendStatus === "error" && (
            <div className="flex items-center gap-2 bg-red-500/10 border border-red-500/20 rounded-xl p-3 mb-4 text-left">
              <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              <p className="text-red-300 text-sm">Falha ao enviar e-mail. Tente novamente.</p>
            </div>
          )}

          {email && (
            <button
              type="button"
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
                ? `Reenviar em ${countdown}s`
                : resendStatus === "sent"
                  ? "Reenviar novamente"
                  : `Reenviar e-mail de verifica${"\u00e7\u00e3o"}`}
            </button>
          )}

          <div className="border-t border-white/10 pt-4">
            <p className="text-slate-500 text-xs mb-3">E-mail errado?</p>
            <Link
              href="/register"
              className="text-emerald-400 hover:text-emerald-300 text-sm font-medium transition"
            >
              Voltar ao cadastro
            </Link>
            <span className="text-slate-600 mx-3">?</span>
            <Link href={loginHref} className="text-slate-400 hover:text-slate-300 text-sm transition">
              Entrar
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
