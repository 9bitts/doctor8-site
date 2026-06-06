"use client";
// src/app/(auth)/forgot-password/page.tsx

import { useState } from "react";
import Link from "next/link";
import { Loader2, CheckCircle2, ArrowLeft, Mail } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (res.ok) { setSent(true); }
      else { setError("Something went wrong. Please try again."); }
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Doctor<span className="text-emerald-400">8</span>
          </h1>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {sent ? (
            <div className="text-center py-4">
              <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-xl font-bold text-white mb-2">Check your email</h2>
              <p className="text-slate-400 text-sm mb-6">
                If an account exists for <strong className="text-white">{email}</strong>, you will receive a password reset link within a few minutes.
              </p>
              <Link href="/login" className="text-emerald-400 hover:text-emerald-300 text-sm font-medium">
                ← Back to login
              </Link>
            </div>
          ) : (
            <>
              <Link href="/login" className="flex items-center gap-2 text-slate-400 hover:text-white text-sm mb-6 transition">
                <ArrowLeft size={16} /> Back to login
              </Link>
              <h2 className="text-xl font-bold text-white mb-2">Reset your password</h2>
              <p className="text-slate-400 text-sm mb-6">
                Enter your email address and we&apos;ll send you a reset link.
              </p>
              {error && <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>}
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Email address</label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email" required value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@example.com"
                      className="w-full bg-white/5 border border-white/10 rounded-xl pl-10 pr-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                    />
                  </div>
                </div>
                <button type="submit" disabled={loading}
                  className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  {loading && <Loader2 size={16} className="animate-spin" />}
                  {loading ? "Sending..." : "Send reset link"}
                </button>
              </form>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
