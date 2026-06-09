"use client";

// src/app/(auth)/login/page.tsx
// Login page — email/password + Google OAuth
// Handles: verified=true success, EmailNotVerified error, AccountLocked error

import { useState, useEffect, Suspense } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, Mail,
} from "lucide-react";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [unverifiedEmail, setUnverifiedEmail] = useState("");

  const verified = searchParams.get("verified") === "true";
  const callbackUrl = searchParams.get("callbackUrl") || "";

  // Handle error params from NextAuth redirects
  useEffect(() => {
    const err = searchParams.get("error");
    if (err === "EmailNotVerified") {
      setError("unverified");
    } else if (err === "AccountLocked") {
      setError("locked");
    } else if (err === "InvalidVerificationLink") {
      setError("Please request a new verification link.");
    } else if (err === "VerificationFailed") {
      setError("Verification failed. Please try again or request a new link.");
    } else if (err) {
      setError("invalid");
    }
  }, [searchParams]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    setUnverifiedEmail("");

    try {
      // Pre-check: does this email need verification?
      const checkRes = await fetch("/api/auth/check-verification", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      if (checkRes.ok) {
        const { needsVerification } = await checkRes.json();
        if (needsVerification) {
          setError("unverified");
          setUnverifiedEmail(email);
          setLoading(false);
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        if (
          result.error === "EmailNotVerified" ||
          result.error.includes("EmailNotVerified")
        ) {
          setError("unverified");
          setUnverifiedEmail(email);
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

      // Redirect based on role
      const sessionRes = await fetch("/api/auth/session");
      const session = await sessionRes.json();
      const role = session?.user?.role;

      if (callbackUrl) {
        router.push(callbackUrl);
      } else if (role === "PROFESSIONAL") {
        router.push("/professional");
      } else {
        router.push("/patient");
      }
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setGoogleLoading(true);
    setError("");
    await signIn("google", { callbackUrl: "/callback" });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-md">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Doctor<span className="text-emerald-400">8</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Sign in to your account</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

          {/* Success: email verified */}
          {verified && (
            <div className="flex items-start gap-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl p-4 mb-6">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5 shrink-0" />
              <p className="text-emerald-300 text-sm">
                Email verified successfully! You can now sign in.
              </p>
            </div>
          )}

          {/* Error messages */}
          {error === "unverified" && (
            <div className="bg-amber-500/10 border border-amber-500/20 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3 mb-3">
                <Mail className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div>
                  <p className="text-amber-300 text-sm font-medium">Email not verified</p>
                  <p className="text-amber-400/80 text-xs mt-1">
                    Please check your inbox and click the verification link before signing in.
                  </p>
                </div>
              </div>
              {unverifiedEmail && (
                <Link
                  href={`/verify-email?email=${encodeURIComponent(unverifiedEmail)}`}
                  className="text-xs text-amber-300 hover:text-amber-200 underline"
                >
                  Resend verification email →
                </Link>
              )}
            </div>
          )}

          {error === "locked" && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-300 text-sm">
                Account temporarily locked due to too many failed attempts. Try again in 30 minutes.
              </p>
            </div>
          )}

          {error === "invalid" && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-300 text-sm">Invalid email or password.</p>
            </div>
          )}

          {error !== "" && error !== "unverified" && error !== "locked" && error !== "invalid" && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          )}

          {/* Google Sign In */}
          <button
            onClick={handleGoogleSignIn}
            disabled={googleLoading || loading}
            className="w-full flex items-center justify-center gap-3 bg-white hover:bg-slate-50 text-slate-800 font-semibold py-3 rounded-xl transition mb-4 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {googleLoading ? (
              <Loader2 className="w-5 h-5 animate-spin text-slate-600" />
            ) : (
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-4 mb-4">
            <div className="flex-1 h-px bg-white/10" />
            <span className="text-slate-500 text-xs uppercase tracking-wider">or</span>
            <div className="flex-1 h-px bg-white/10" />
          </div>

          {/* Credentials form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Email address
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-12 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <div className="flex justify-end">
              <Link
                href="/forgot-password"
                className="text-sm text-emerald-400 hover:text-emerald-300 transition"
              >
                Forgot password?
              </Link>
            </div>

            <button
              type="submit"
              disabled={loading || googleLoading}
              className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              {loading ? "Signing in..." : "Sign in"}
            </button>
          </form>

          <div className="border-t border-white/10 mt-6 pt-6 text-center">
            <p className="text-slate-400 text-sm">
              Don&apos;t have an account?{" "}
              <Link
                href="/register"
                className="text-emerald-400 hover:text-emerald-300 font-medium transition"
              >
                Create account
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
 
