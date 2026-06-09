"use client";

// src/app/(auth)/register/page.tsx
// Step 1: choose role (Patient / Professional)
// Step 2: registration form for that role — Google OAuth + email/password
// The chosen role is stored in a cookie so Google sign-up creates the correct account type.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";
import {
  Eye, EyeOff, Loader2, AlertCircle, CheckCircle2,
  User, Stethoscope, ArrowLeft,
} from "lucide-react";

type Role = "PATIENT" | "PROFESSIONAL";
type Region = "US" | "EU" | "BR";

const PASSWORD_RULES = [
  { label: "At least 8 characters", test: (p: string) => p.length >= 8 },
  { label: "One uppercase letter", test: (p: string) => /[A-Z]/.test(p) },
  { label: "One number", test: (p: string) => /[0-9]/.test(p) },
  { label: "One special character", test: (p: string) => /[^A-Za-z0-9]/.test(p) },
];

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [role, setRole] = useState<Role>("PATIENT");
  const [region, setRegion] = useState<Region>("US");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false);
  const [acceptedHipaa, setAcceptedHipaa] = useState(false);
  const [acceptedGdpr, setAcceptedGdpr] = useState(false);

  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const passwordStrength = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const isPasswordValid = passwordStrength === PASSWORD_RULES.length;

  const canSubmit =
    isPasswordValid &&
    acceptedTerms &&
    acceptedPrivacy &&
    (region !== "US" || acceptedHipaa) &&
    (region !== "EU" || acceptedGdpr);

  function chooseRole(r: Role) {
    setRole(r);
    setStep(2);
    setErrors({});
  }

  async function handleGoogleSignUp() {
    // Store chosen role so the server creates the right account type after Google redirect
    document.cookie = `signup_role=${role}; path=/; max-age=600; SameSite=Lax`;
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/callback" });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setErrors({});

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          role,
          region,
          firstName,
          lastName,
          acceptedTerms,
          acceptedPrivacy,
          acceptedHipaa: region === "US" ? acceptedHipaa : undefined,
          acceptedGdpr: region === "EU" ? acceptedGdpr : undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrors(data.error || { general: ["Registration failed"] });
        return;
      }

      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setErrors({ general: ["Something went wrong. Please try again."] });
    } finally {
      setLoading(false);
    }
  }

  const isProfessional = role === "PROFESSIONAL";

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Doctor<span className="text-emerald-400">8</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">
            {step === 1 ? "Create your account" : isProfessional ? "Healthcare professional sign up" : "Patient sign up"}
          </p>
        </div>

        {/* ───────── STEP 1: ROLE CHOICE ───────── */}
        {step === 1 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
            <p className="text-center text-slate-300 text-sm mb-6">
              How would you like to use Doctor8?
            </p>

            <div className="space-y-4">
              <button
                onClick={() => chooseRole("PATIENT")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-emerald-500 hover:bg-emerald-500/10 transition text-left group"
              >
                <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition">
                  <User className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-base">I&apos;m a Patient</p>
                  <p className="text-slate-400 text-sm mt-0.5">
                    Book appointments, manage your health records and consult specialists.
                  </p>
                </div>
              </button>

              <button
                onClick={() => chooseRole("PROFESSIONAL")}
                className="w-full flex items-center gap-4 p-5 rounded-2xl border-2 border-white/10 bg-white/5 hover:border-emerald-500 hover:bg-emerald-500/10 transition text-left group"
              >
                <div className="w-14 h-14 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center shrink-0 group-hover:bg-emerald-500/20 transition">
                  <Stethoscope className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <p className="text-white font-semibold text-base">I&apos;m a Healthcare Professional</p>
                  <p className="text-slate-400 text-sm mt-0.5">
                    Receive patients, manage your schedule and grow your practice.
                  </p>
                </div>
              </button>
            </div>

            <div className="border-t border-white/10 mt-6 pt-6 text-center">
              <p className="text-slate-400 text-sm">
                Already have an account?{" "}
                <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        )}

        {/* ───────── STEP 2: REGISTRATION FORM ───────── */}
        {step === 2 && (
          <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

            {/* Back + role badge */}
            <button
              onClick={() => setStep(1)}
              className="flex items-center gap-1.5 text-slate-400 hover:text-white text-sm transition mb-5"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </button>

            <div className="flex items-center gap-3 mb-6 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
              {isProfessional ? (
                <Stethoscope className="w-5 h-5 text-emerald-400 shrink-0" />
              ) : (
                <User className="w-5 h-5 text-emerald-400 shrink-0" />
              )}
              <p className="text-emerald-300 text-sm font-medium">
                {isProfessional ? "Healthcare Professional account" : "Patient account"}
              </p>
            </div>

            {errors.general && (
              <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
                <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
                <p className="text-red-300 text-sm">{errors.general[0]}</p>
              </div>
            )}

            {/* Google sign up */}
            <button
              onClick={handleGoogleSignUp}
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
              {isProfessional ? "Sign up as professional with Google" : "Sign up with Google"}
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className="flex-1 h-px bg-white/10" />
              <span className="text-slate-500 text-xs uppercase tracking-wider">or</span>
              <div className="flex-1 h-px bg-white/10" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">

              {/* Region */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Your region</label>
                <select
                  value={region}
                  onChange={(e) => setRegion(e.target.value as Region)}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                >
                  <option value="US" className="bg-slate-800">🇺🇸 United States</option>
                  <option value="EU" className="bg-slate-800">🇪🇺 European Union</option>
                  <option value="BR" className="bg-slate-800">🇧🇷 Brazil</option>
                </select>
              </div>

              {/* Name */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">First name</label>
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Last name</label>
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Email address</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition"
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email[0]}</p>}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Password</label>
                <div className="relative">
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
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

                {password && (
                  <div className="mt-3 space-y-1">
                    {PASSWORD_RULES.map((rule) => (
                      <div key={rule.label} className="flex items-center gap-2">
                        <CheckCircle2
                          className={`w-3.5 h-3.5 ${rule.test(password) ? "text-emerald-400" : "text-slate-600"}`}
                        />
                        <span className={`text-xs ${rule.test(password) ? "text-emerald-400" : "text-slate-500"}`}>
                          {rule.label}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Professional note */}
              {isProfessional && (
                <p className="text-xs text-slate-400 bg-white/5 border border-white/10 rounded-xl p-3">
                  After signing up, you&apos;ll complete your professional profile (specialty,
                  registration number, price and availability) to start receiving patients.
                </p>
              )}

              {/* Consents */}
              <div className="border-t border-white/10 pt-5 space-y-3">
                <p className="text-xs text-slate-400 font-medium uppercase tracking-wider">Required agreements</p>

                <Checkbox
                  checked={acceptedTerms}
                  onChange={setAcceptedTerms}
                  label={<>I accept the <Link href="/terms" className="text-emerald-400 hover:underline" target="_blank">Terms of Service</Link></>}
                />
                <Checkbox
                  checked={acceptedPrivacy}
                  onChange={setAcceptedPrivacy}
                  label={<>I accept the <Link href="/privacy" className="text-emerald-400 hover:underline" target="_blank">Privacy Policy</Link></>}
                />
                {region === "US" && (
                  <Checkbox
                    checked={acceptedHipaa}
                    onChange={setAcceptedHipaa}
                    label={<>I acknowledge the <Link href="/hipaa" className="text-emerald-400 hover:underline" target="_blank">HIPAA Authorization</Link> for sharing my health information</>}
                  />
                )}
                {region === "EU" && (
                  <Checkbox
                    checked={acceptedGdpr}
                    onChange={setAcceptedGdpr}
                    label={<>I consent to the processing of my personal data as described in our <Link href="/privacy" className="text-emerald-400 hover:underline" target="_blank">Privacy Policy</Link> (GDPR)</>}
                  />
                )}
              </div>

              <button
                type="submit"
                disabled={loading || googleLoading || !canSubmit}
                className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:opacity-40 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2"
              >
                {loading && <Loader2 className="w-4 h-4 animate-spin" />}
                {loading ? "Creating account..." : "Create account"}
              </button>
            </form>

            <div className="border-t border-white/10 mt-6 pt-6 text-center">
              <p className="text-slate-400 text-sm">
                Already have an account?{" "}
                <Link href="/login" className="text-emerald-400 hover:text-emerald-300 font-medium transition">
                  Sign in
                </Link>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Checkbox({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: React.ReactNode;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer group">
      <div
        className={`mt-0.5 w-5 h-5 rounded-md border-2 flex items-center justify-center shrink-0 transition ${
          checked ? "bg-emerald-500 border-emerald-500" : "border-white/20 bg-white/5"
        }`}
        onClick={() => onChange(!checked)}
      >
        {checked && (
          <svg className="w-3 h-3 text-white" viewBox="0 0 12 12" fill="none">
            <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </div>
      <span className="text-sm text-slate-300 leading-relaxed">{label}</span>
    </label>
  );
}
