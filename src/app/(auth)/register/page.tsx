"use client";

// src/app/(auth)/register/page.tsx
// Registration page with role selection, region detection, and compliance consents

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Eye, EyeOff, Loader2, AlertCircle, CheckCircle2, User, Stethoscope } from "lucide-react";

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
  const [errors, setErrors] = useState<Record<string, string[]>>({});

  const passwordStrength = PASSWORD_RULES.filter((r) => r.test(password)).length;
  const isPasswordValid = passwordStrength === PASSWORD_RULES.length;

  const canSubmit =
    isPasswordValid &&
    acceptedTerms &&
    acceptedPrivacy &&
    (region !== "US" || acceptedHipaa) &&
    (region !== "EU" || acceptedGdpr);

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

      // Redirect to verify-email page with the email address
      router.push(`/verify-email?email=${encodeURIComponent(email)}`);
    } catch {
      setErrors({ general: ["Something went wrong. Please try again."] });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Logo */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white tracking-tight">
            Doctor<span className="text-emerald-400">8</span>
          </h1>
          <p className="text-slate-400 mt-2 text-sm">Create your account</p>
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

          {errors.general && (
            <div className="flex items-start gap-3 bg-red-500/10 border border-red-500/20 rounded-xl p-4 mb-6">
              <AlertCircle className="w-5 h-5 text-red-400 mt-0.5 shrink-0" />
              <p className="text-red-300 text-sm">{errors.general[0]}</p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">

            {/* Role selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-3">
                I am a...
              </label>
              <div className="grid grid-cols-2 gap-3">
                {(["PATIENT", "PROFESSIONAL"] as Role[]).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRole(r)}
                    className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition font-medium text-sm ${
                      role === r
                        ? "border-emerald-500 bg-emerald-500/10 text-emerald-400"
                        : "border-white/10 bg-white/5 text-slate-400 hover:border-white/20"
                    }`}
                  >
                    {r === "PATIENT" ? (
                      <User className="w-6 h-6" />
                    ) : (
                      <Stethoscope className="w-6 h-6" />
                    )}
                    {r === "PATIENT" ? "Patient" : "Healthcare Professional"}
                  </button>
                ))}
              </div>
            </div>

            {/* Region selection */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Your region
              </label>
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
                        className={`w-3.5 h-3.5 ${
                          rule.test(password) ? "text-emerald-400" : "text-slate-600"
                        }`}
                      />
                      <span
                        className={`text-xs ${
                          rule.test(password) ? "text-emerald-400" : "text-slate-500"
                        }`}
                      >
                        {rule.label}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Consent checkboxes */}
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

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !canSubmit}
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
