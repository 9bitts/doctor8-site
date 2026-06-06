"use client";
// src/app/(auth)/reset-password/page.tsx

import { useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, CheckCircle2 } from "lucide-react";

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [show, setShow] = useState(false);
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const rules = [
    { ok: password.length >= 8, label: "At least 8 characters" },
    { ok: /[A-Z]/.test(password), label: "One uppercase letter" },
    { ok: /[0-9]/.test(password), label: "One number" },
    { ok: /[^A-Za-z0-9]/.test(password), label: "One special character" },
    { ok: password === confirm && confirm.length > 0, label: "Passwords match" },
  ];
  const valid = rules.every((r) => r.ok) && !!token;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!valid) return;
    setLoading(true); setError("");
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const d = await res.json();
      if (!res.ok) { setError(d.error || "Invalid or expired link."); return; }
      setDone(true);
      setTimeout(() => router.push("/login"), 3000);
    } catch { setError("Something went wrong."); }
    finally { setLoading(false); }
  }

  if (!token) return (
    <Wrapper>
      <p className="text-red-400 text-center">Invalid reset link. <Link href="/forgot-password" className="text-emerald-400 underline">Request a new one.</Link></p>
    </Wrapper>
  );

  return (
    <Wrapper>
      {done ? (
        <div className="text-center py-4">
          <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={32} className="text-emerald-400" />
          </div>
          <h2 className="text-xl font-bold text-white mb-2">Password updated!</h2>
          <p className="text-slate-400 text-sm">Redirecting to login...</p>
        </div>
      ) : (
        <>
          <h2 className="text-xl font-bold text-white mb-2">Create new password</h2>
          <p className="text-slate-400 text-sm mb-6">Choose a strong password for your account.</p>
          {error && <p className="text-red-400 text-sm mb-4 bg-red-500/10 border border-red-500/20 rounded-xl p-3">{error}</p>}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">New password</label>
              <div className="relative">
                <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition" />
                <button type="button" onClick={() => setShow(!show)} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white">
                  {show ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Confirm password</label>
              <input type={show ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} required
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition" />
            </div>
            {password && (
              <div className="bg-white/5 rounded-xl p-3 space-y-1.5">
                {rules.map((r) => (
                  <div key={r.label} className="flex items-center gap-2">
                    <CheckCircle2 size={13} className={r.ok ? "text-emerald-400" : "text-slate-600"} />
                    <span className={`text-xs ${r.ok ? "text-emerald-400" : "text-slate-500"}`}>{r.label}</span>
                  </div>
                ))}
              </div>
            )}
            <button type="submit" disabled={loading || !valid}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? "Updating..." : "Update password"}
            </button>
          </form>
        </>
      )}
    </Wrapper>
  );
}

function Wrapper({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white">Doctor<span className="text-emerald-400">8</span></h1>
        </div>
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">{children}</div>
      </div>
    </div>
  );
}
