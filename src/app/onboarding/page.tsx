"use client";
// src/app/onboarding/page.tsx
// First-time setup after registration — collects essential profile info

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, CheckCircle2, User, Stethoscope, ChevronRight } from "lucide-react";

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState<"PATIENT" | "PROFESSIONAL">("PATIENT");
  const [saving, setSaving] = useState(false);

  // Patient fields
  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [allergies, setAllergies] = useState("");

  // Professional fields
  const [license, setLicense] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [price, setPrice] = useState("");
  const [teleconsult, setTeleconsult] = useState(true);

  async function handleFinish() {
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, phone, dob, bloodType, allergies, license, specialty, bio, price: Number(price) * 100, teleconsult }),
      });
      router.push(role === "PATIENT" ? "/patient" : "/professional");
    } finally { setSaving(false); }
  }

  const progress = (step / 3) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white">Doctor<span className="text-emerald-400">8</span></h1>
          <p className="text-slate-400 mt-2 text-sm">Let&apos;s set up your profile</p>
        </div>

        {/* Progress bar */}
        <div className="h-1.5 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

          {/* Step 1 — Role */}
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-2">Welcome! How will you use Doctor8?</h2>
              <p className="text-slate-400 text-sm mb-6">This helps us personalize your experience.</p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {(["PATIENT", "PROFESSIONAL"] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition ${role === r ? "border-emerald-500 bg-emerald-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${role === r ? "bg-emerald-500/20" : "bg-white/10"}`}>
                      {r === "PATIENT" ? <User size={28} className={role === r ? "text-emerald-400" : "text-slate-400"} /> : <Stethoscope size={28} className={role === r ? "text-emerald-400" : "text-slate-400"} />}
                    </div>
                    <div className="text-center">
                      <p className={`font-semibold ${role === r ? "text-emerald-400" : "text-slate-300"}`}>
                        {r === "PATIENT" ? "Patient" : "Healthcare Professional"}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {r === "PATIENT" ? "Manage my health" : "Care for patients"}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <button onClick={() => setStep(2)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                Continue <ChevronRight size={18} />
              </button>
            </div>
          )}

          {/* Step 2 — Basic info */}
          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-2">
                {role === "PATIENT" ? "Your health info" : "Your credentials"}
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                {role === "PATIENT" ? "Helps doctors understand you quickly." : "Required to appear in search results."}
              </p>

              {role === "PATIENT" ? (
                <>
                  <Field label="Phone number">
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="+1 (555) 000-0000" className="inp" />
                  </Field>
                  <Field label="Date of birth">
                    <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className="inp" />
                  </Field>
                  <Field label="Blood type">
                    <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className="inp">
                      <option value="">Unknown</option>
                      {["A+","A-","B+","B-","AB+","AB-","O+","O-"].map((t) => <option key={t}>{t}</option>)}
                    </select>
                  </Field>
                  <Field label="Known allergies (optional)">
                    <input type="text" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder="e.g. Penicillin, Peanuts" className="inp" />
                  </Field>
                </>
              ) : (
                <>
                  <Field label="License number *">
                    <input required type="text" value={license} onChange={(e) => setLicense(e.target.value)} placeholder="e.g. CRM 12345" className="inp" />
                  </Field>
                  <Field label="Specialty *">
                    <select required value={specialty} onChange={(e) => setSpecialty(e.target.value)} className="inp">
                      <option value="">Select your specialty</option>
                      {["General Practice","Cardiology","Dermatology","Gynecology","Neurology","Orthopedics","Pediatrics","Psychiatry","Psychology","Nutrition","Cannabis Medicine","Other"].map((s) => <option key={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label="Consultation price (USD) *">
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input required type="number" min="10" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="80" className="inp pl-7" />
                    </div>
                  </Field>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setTeleconsult(!teleconsult)}
                      className={`w-10 h-6 rounded-full transition-colors ${teleconsult ? "bg-emerald-500" : "bg-slate-600"}`}>
                      <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${teleconsult ? "translate-x-4" : ""}`} />
                    </button>
                    <span className="text-sm text-slate-300">Available for teleconsultation</span>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(1)} className="px-6 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white font-medium transition">
                  Back
                </button>
                <button onClick={() => setStep(3)} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  Continue <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {/* Step 3 — Bio / confirm */}
          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-2">Almost done!</h2>
              <p className="text-slate-400 text-sm mb-4">
                {role === "PROFESSIONAL" ? "Add a bio so patients can learn about you." : "You're all set. Review and confirm."}
              </p>

              {role === "PROFESSIONAL" && (
                <Field label="Bio (optional)">
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
                    placeholder="Tell patients about your experience and approach..."
                    className="inp resize-none" />
                </Field>
              )}

              <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-slate-400 font-medium text-xs uppercase tracking-wide mb-2">Summary</p>
                <SummaryRow label="Role" value={role === "PATIENT" ? "Patient" : "Healthcare Professional"} />
                {role === "PROFESSIONAL" && <>
                  <SummaryRow label="Specialty" value={specialty || "—"} />
                  <SummaryRow label="Price" value={price ? `$${price}/consultation` : "—"} />
                  <SummaryRow label="Teleconsult" value={teleconsult ? "Yes" : "No"} />
                </>}
                {role === "PATIENT" && <>
                  <SummaryRow label="Blood type" value={bloodType || "Unknown"} />
                </>}
              </div>

              <div className="flex gap-3 pt-2">
                <button onClick={() => setStep(2)} className="px-6 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white font-medium transition">
                  Back
                </button>
                <button onClick={handleFinish} disabled={saving}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  {saving ? <><Loader2 size={16} className="animate-spin" /> Setting up...</> : <><CheckCircle2 size={18} /> Finish setup</>}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">
          You can update this information anytime in Settings.
        </p>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="block text-sm font-medium text-slate-300 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between">
      <span className="text-slate-500">{label}</span>
      <span className="text-slate-200 font-medium">{value}</span>
    </div>
  );
}
