"use client";
// src/app/onboarding/page.tsx — first-time profile setup (i18n)

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, CheckCircle2, User, Stethoscope, ChevronRight } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

const inputClass = "w-full border border-white/15 rounded-xl px-4 py-2.5 text-sm text-slate-100 bg-white/5 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/20";

type Step = 1 | 2 | 3;

export default function OnboardingPage() {
  return (
    <Suspense>
      <OnboardingInner />
    </Suspense>
  );
}

function OnboardingInner() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const psychologistPortal = searchParams.get("portal") === "psychologist";
  const { t } = useI18n();
  const [step, setStep] = useState<Step>(1);
  const [role, setRole] = useState<"PATIENT" | "PROFESSIONAL">("PATIENT");
  const [saving, setSaving] = useState(false);

  const [phone, setPhone] = useState("");
  const [dob, setDob] = useState("");
  const [bloodType, setBloodType] = useState("");
  const [allergies, setAllergies] = useState("");
  const [license, setLicense] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [bio, setBio] = useState("");
  const [price, setPrice] = useState("");
  const [teleconsult, setTeleconsult] = useState(true);

  useEffect(() => {
    if (psychologistPortal) {
      setRole("PROFESSIONAL");
      setSpecialty("Psychologist");
      setStep(2);
    }
  }, [psychologistPortal]);

  async function handleFinish() {
    setSaving(true);
    try {
      await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ role, phone, dob, bloodType, allergies, license, specialty, bio, price: Number(price) * 100, teleconsult }),
      });
      router.push(
        role === "PATIENT"
          ? "/patient"
          : psychologistPortal
            ? "/psychologist"
            : "/professional",
      );
    } finally { setSaving(false); }
  }

  const progress = (step / 3) * 100;
  const specialties = [
    "General Practice", "Cardiology", "Dermatology", "Gynecology", "Neurology",
    "Orthopedics", "Pediatrics", "Psychiatry", "Psychology", "Nutrition", "Cannabis Medicine", "Other",
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-blue-950 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-lg">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black text-white">Doctor<span className="text-emerald-400">8</span></h1>
          <p className="text-slate-400 mt-2 text-sm">{t("onb.tagline")}</p>
        </div>

        <div className="h-1.5 bg-white/10 rounded-full mb-8 overflow-hidden">
          <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
        </div>

        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">
          {step === 1 && (
            <div>
              <h2 className="text-xl font-bold text-white mb-2">{t("onb.step1Title")}</h2>
              <p className="text-slate-400 text-sm mb-6">{t("onb.step1Subtitle")}</p>
              <div className="grid grid-cols-2 gap-4 mb-8">
                {(["PATIENT", "PROFESSIONAL"] as const).map((r) => (
                  <button key={r} type="button" onClick={() => setRole(r)}
                    className={`flex flex-col items-center gap-3 p-6 rounded-2xl border-2 transition ${role === r ? "border-emerald-500 bg-emerald-500/10" : "border-white/10 bg-white/5 hover:border-white/20"}`}>
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center ${role === r ? "bg-emerald-500/20" : "bg-white/10"}`}>
                      {r === "PATIENT" ? <User size={28} className={role === r ? "text-emerald-400" : "text-slate-400"} /> : <Stethoscope size={28} className={role === r ? "text-emerald-400" : "text-slate-400"} />}
                    </div>
                    <div className="text-center">
                      <p className={`font-semibold ${role === r ? "text-emerald-400" : "text-slate-300"}`}>
                        {r === "PATIENT" ? t("onb.rolePatient") : t("onb.roleProfessional")}
                      </p>
                      <p className="text-xs text-slate-500 mt-1">
                        {r === "PATIENT" ? t("onb.rolePatientHint") : t("onb.roleProHint")}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
              <button type="button" onClick={() => setStep(2)}
                className="w-full bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                {t("onb.continue")} <ChevronRight size={18} />
              </button>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-2">
                {role === "PATIENT" ? t("onb.step2PatientTitle") : t("onb.step2ProTitle")}
              </h2>
              <p className="text-slate-400 text-sm mb-4">
                {role === "PATIENT" ? t("onb.step2PatientSubtitle") : t("onb.step2ProSubtitle")}
              </p>

              {role === "PATIENT" ? (
                <>
                  <Field label={t("onb.phone")}>
                    <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t("onb.phonePlaceholder")} className={inputClass} />
                  </Field>
                  <Field label={t("onb.dob")}>
                    <input type="date" value={dob} onChange={(e) => setDob(e.target.value)} className={inputClass} />
                  </Field>
                  <Field label={t("onb.bloodType")}>
                    <select value={bloodType} onChange={(e) => setBloodType(e.target.value)} className={inputClass}>
                      <option value="">{t("onb.unknown")}</option>
                      {["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-"].map((bt) => <option key={bt}>{bt}</option>)}
                    </select>
                  </Field>
                  <Field label={t("onb.allergies")}>
                    <input type="text" value={allergies} onChange={(e) => setAllergies(e.target.value)} placeholder={t("onb.allergiesPlaceholder")} className={inputClass} />
                  </Field>
                </>
              ) : (
                <>
                  <Field label={t("onb.license")}>
                    <input required type="text" value={license} onChange={(e) => setLicense(e.target.value)} placeholder={t("onb.licensePlaceholder")} className={inputClass} />
                  </Field>
                  <Field label={t("onb.specialty")}>
                    <select required value={specialty} onChange={(e) => setSpecialty(e.target.value)} className={inputClass}>
                      <option value="">{t("onb.selectSpecialty")}</option>
                      {specialties.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                  </Field>
                  <Field label={t("onb.price")}>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 text-sm">$</span>
                      <input required type="number" min="10" value={price} onChange={(e) => setPrice(e.target.value)} placeholder="80" className={`${inputClass} pl-7`} />
                    </div>
                  </Field>
                  <div className="flex items-center gap-3">
                    <button type="button" onClick={() => setTeleconsult(!teleconsult)}
                      className={`w-10 h-6 rounded-full transition-colors ${teleconsult ? "bg-emerald-500" : "bg-slate-600"}`}>
                      <div className={`w-4 h-4 bg-white rounded-full mx-1 transition-transform ${teleconsult ? "translate-x-4" : ""}`} />
                    </button>
                    <span className="text-sm text-slate-300">{t("onb.teleconsult")}</span>
                  </div>
                </>
              )}

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(1)} className="px-6 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white font-medium transition">
                  {t("onb.back")}
                </button>
                <button type="button" onClick={() => setStep(3)} className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  {t("onb.continue")} <ChevronRight size={18} />
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold text-white mb-2">{t("onb.step3Title")}</h2>
              <p className="text-slate-400 text-sm mb-4">
                {role === "PROFESSIONAL" ? t("onb.step3ProSubtitle") : t("onb.step3PatientSubtitle")}
              </p>

              {role === "PROFESSIONAL" && (
                <Field label={t("onb.bio")}>
                  <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4}
                    placeholder={t("onb.bioPlaceholder")} className={`${inputClass} resize-none`} />
                </Field>
              )}

              <div className="bg-white/5 rounded-xl p-4 space-y-2 text-sm">
                <p className="text-slate-400 font-medium text-xs uppercase tracking-wide mb-2">{t("onb.summary")}</p>
                <SummaryRow label={t("onb.summaryRole")} value={role === "PATIENT" ? t("onb.rolePatient") : t("onb.roleProfessional")} />
                {role === "PROFESSIONAL" && <>
                  <SummaryRow label={t("onb.specialty")} value={specialty || "—"} />
                  <SummaryRow label={t("onb.summaryPrice")} value={price ? `$${price}/${t("onb.consultUnit")}` : "—"} />
                  <SummaryRow label={t("onb.teleconsult")} value={teleconsult ? t("onb.yes") : t("onb.no")} />
                </>}
                {role === "PATIENT" && <>
                  <SummaryRow label={t("onb.bloodType")} value={bloodType || t("onb.unknown")} />
                </>}
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setStep(2)} className="px-6 py-3 rounded-xl border border-white/10 text-slate-400 hover:text-white font-medium transition">
                  {t("onb.back")}
                </button>
                <button type="button" onClick={handleFinish} disabled={saving}
                  className="flex-1 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-white font-semibold py-3 rounded-xl transition flex items-center justify-center gap-2">
                  {saving ? <><Loader2 size={16} className="animate-spin" /> {t("onb.saving")}</> : <><CheckCircle2 size={18} /> {t("onb.finish")}</>}
                </button>
              </div>
            </div>
          )}
        </div>

        <p className="text-center text-slate-600 text-xs mt-4">{t("onb.footer")}</p>
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
