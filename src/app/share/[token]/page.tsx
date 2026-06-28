"use client";

// src/app/share/[token]/page.tsx
// Public page — anyone with the link can view the shared record (no login needed)

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FileText, Pill, Clock, AlertCircle, Loader2, Shield } from "lucide-react";
import { translate, normalizeLang, type Lang, type TranslationKey } from "@/lib/i18n/translations";

const LANG_KEY = "doctor8.lang";

function detectLang(): Lang {
  if (typeof window === "undefined") return "pt";
  try {
    const stored = localStorage.getItem(LANG_KEY);
    if (stored) return normalizeLang(stored);
  } catch { /* ignore */ }
  const l = document.documentElement.lang || navigator.language || "pt";
  if (l.startsWith("en")) return "en";
  if (l.startsWith("es")) return "es";
  return "pt";
}

interface SharedData {
  title: string;
  type: string;
  patientName: string;
  createdAt: string;
  expiresAt: string | null;
  content: Record<string, unknown>;
}

export default function SharedRecordPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Lang>("pt");

  const t = (key: TranslationKey) => translate(lang, key);

  useEffect(() => {
    setLang(detectLang());
  }, []);

  useEffect(() => {
    if (!token) return;
    fetch(`/api/shared/${token}`)
      .then((r) => r.json())
      .then((d) => {
        if (d.error) setError(d.error);
        else setData(d);
      })
      .catch(() => setError(t("sharePublic.errLoad")))
      .finally(() => setLoading(false));
  }, [token, lang]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="animate-spin text-emerald-500" size={32} />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl border border-red-200 shadow-sm p-8 max-w-md w-full text-center">
          <AlertCircle size={40} className="text-red-400 mx-auto mb-4" />
          <h2 className="text-lg font-bold text-slate-800 mb-2">{t("sharePublic.unavailableTitle")}</h2>
          <p className="text-slate-500 text-sm">{error}</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const isMedications = data.type === "OTHER" || (data.content as any).medications;
  const content = data.content;

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Header */}
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <span className="text-xl font-black text-slate-900">
            Doctor<span className="text-emerald-500">8</span>
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Shield size={12} className="text-emerald-500" />
            HIPAA & GDPR Compliant
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        {/* Record header */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
              {isMedications ? (
                <Pill size={22} className="text-emerald-600" />
              ) : (
                <FileText size={22} className="text-emerald-600" />
              )}
            </div>
            <div className="flex-1">
              <h1 className="text-xl font-bold text-slate-900">{data.title}</h1>
              <p className="text-sm text-slate-500 mt-1">Patient: <strong>{data.patientName}</strong></p>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
                <Clock size={11} />
                Shared on {new Date(data.createdAt).toLocaleDateString("en-US", {
                  month: "long", day: "numeric", year: "numeric",
                })}
                {data.expiresAt && (
                  <> · Expires {new Date(data.expiresAt).toLocaleDateString("en-US", {
                    month: "short", day: "numeric", year: "numeric",
                  })}</>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Medications view */}
        {isMedications && Array.isArray((content as any).medications) && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Pill size={16} className="text-emerald-500" /> Active Medications
            </h2>
            {(content as any).medications.length === 0 ? (
              <p className="text-slate-400 text-sm">No medications listed.</p>
            ) : (
              <div className="space-y-3">
                {(content as any).medications.map((med: any, i: number) => (
                  <div key={i} className="border border-slate-100 rounded-xl p-4">
                    <p className="font-semibold text-slate-800">{med.name}</p>
                    {med.dosage && <p className="text-sm text-slate-500 mt-1">Dosage: {med.dosage}</p>}
                    {med.frequency && <p className="text-sm text-slate-500">Frequency: {med.frequency}</p>}
                    {med.prescribedBy && <p className="text-sm text-slate-500">Prescribed by: {med.prescribedBy}</p>}
                    {med.notes && <p className="text-sm text-slate-400 mt-2 italic">{med.notes}</p>}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Medical history view */}
        {!isMedications && (
          <div className="space-y-4">
            {/* Basic info */}
            <Section title="Patient Information">
              <Row label="Blood Type" value={(content as any).bloodType} />
              <Row label="Allergies" value={(content as any).allergies} />
              <Row label="Weight" value={(content as any).weight ? `${(content as any).weight} kg` : null} />
              <Row label="Height" value={(content as any).height ? `${(content as any).height} cm` : null} />
              <Row label="Profession" value={(content as any).profession} />
            </Section>

            {/* Chief complaint */}
            {(content as any).chiefComplaint && (
              <Section title="Reason for Consultation">
                <p className="text-sm text-slate-700">{(content as any).chiefComplaint}</p>
                {(content as any).symptomDuration && <Row label="Duration" value={(content as any).symptomDuration} />}
                {(content as any).painScale && <Row label="Pain scale" value={`${(content as any).painScale}/10`} />}
              </Section>
            )}

            {/* Chronic conditions */}
            {Array.isArray((content as any).chronicConditions) && (content as any).chronicConditions.length > 0 && (
              <Section title="Chronic Conditions">
                <div className="flex flex-wrap gap-2">
                  {(content as any).chronicConditions.map((c: string) => (
                    <span key={c} className="bg-rose-50 text-rose-700 text-xs px-3 py-1.5 rounded-full">{c}</span>
                  ))}
                </div>
              </Section>
            )}

            {/* Medications in history */}
            {(content as any).currentMedications && (
              <Section title="Current Medications">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{(content as any).currentMedications}</p>
              </Section>
            )}

            {/* Surgeries */}
            {(content as any).surgeries && (
              <Section title="Surgeries & Hospitalizations">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{(content as any).surgeries}</p>
              </Section>
            )}

            {/* Family history */}
            {(content as any).familyHistory && (
              <Section title="Family History">
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{(content as any).familyHistory}</p>
              </Section>
            )}

            {/* Lifestyle */}
            {((content as any).smoking || (content as any).alcohol || (content as any).exercise) && (
              <Section title="Lifestyle">
                <Row label="Smoking" value={(content as any).smoking} />
                <Row label="Alcohol" value={(content as any).alcohol} />
                <Row label="Exercise" value={(content as any).exercise} />
                <Row label="Sleep quality" value={(content as any).sleep} />
              </Section>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Shield size={16} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">
            This record was securely shared by the patient via Doctor8.
            All health data is encrypted and handled in compliance with HIPAA and GDPR regulations.
          </p>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
      <h2 className="font-semibold text-slate-800 mb-4">{title}</h2>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function Row({ label, value }: { label: string; value?: string | null }) {
  if (!value) return null;
  return (
    <div className="flex gap-3 text-sm">
      <span className="text-slate-400 w-32 shrink-0">{label}</span>
      <span className="text-slate-700">{value}</span>
    </div>
  );
}
