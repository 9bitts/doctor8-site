"use client";

// Public page — anyone with the link can view the shared record (no login needed)

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { FileText, Pill, Clock, AlertCircle, Loader2, Shield } from "lucide-react";
import {
  translate,
  normalizeLang,
  localeOf,
  type Lang,
  type TranslationKey,
} from "@/lib/i18n/translations";

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

type MedRow = {
  name?: string;
  dosage?: string;
  frequency?: string;
  prescribedBy?: string;
  notes?: string;
};

type HistoryContent = Record<string, unknown> & {
  medications?: MedRow[];
  bloodType?: string;
  allergies?: string;
  weight?: number;
  height?: number;
  profession?: string;
  chiefComplaint?: string;
  symptomDuration?: string;
  painScale?: number;
  chronicConditions?: string[];
  currentMedications?: string;
  surgeries?: string;
  familyHistory?: string;
  smoking?: string;
  alcohol?: string;
  exercise?: string;
  sleep?: string;
};

export default function SharedRecordPage() {
  const params = useParams();
  const token = params.token as string;

  const [data, setData] = useState<SharedData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [lang, setLang] = useState<Lang>("pt");

  const t = (key: TranslationKey) => translate(lang, key);
  const locale = localeOf(lang);

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

  const content = data.content as HistoryContent;
  const isMedications = data.type === "OTHER" || content.medications;
  const meds = content.medications;

  const sharedDate = new Date(data.createdAt).toLocaleDateString(locale, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
  const expiresDate = data.expiresAt
    ? new Date(data.expiresAt).toLocaleDateString(locale, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="bg-white border-b border-slate-200 px-4 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <span className="text-xl font-black text-slate-900">
            Doctor<span className="text-emerald-500">8</span>
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-500">
            <Shield size={12} className="text-emerald-500" />
            {t("sharePublic.compliance")}
          </div>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
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
              <p className="text-sm text-slate-500 mt-1">
                {t("sharePublic.patientLabel")}: <strong>{data.patientName}</strong>
              </p>
              <p className="text-xs text-slate-400 mt-1 flex items-center gap-1 flex-wrap">
                <Clock size={11} />
                {t("sharePublic.sharedOn")} {sharedDate}
                {expiresDate && (
                  <> · {t("sharePublic.expires")} {expiresDate}</>
                )}
              </p>
            </div>
          </div>
        </div>

        {isMedications && Array.isArray(meds) && (
          <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <h2 className="font-semibold text-slate-800 mb-4 flex items-center gap-2">
              <Pill size={16} className="text-emerald-500" /> {t("sharePublic.activeMeds")}
            </h2>
            {meds.length === 0 ? (
              <p className="text-slate-400 text-sm">{t("sharePublic.noMeds")}</p>
            ) : (
              <div className="space-y-3">
                {meds.map((med, i) => (
                  <div key={i} className="border border-slate-100 rounded-xl p-4">
                    <p className="font-semibold text-slate-800">{med.name}</p>
                    {med.dosage && (
                      <p className="text-sm text-slate-500 mt-1">
                        {t("sharePublic.dosage")}: {med.dosage}
                      </p>
                    )}
                    {med.frequency && (
                      <p className="text-sm text-slate-500">
                        {t("sharePublic.frequency")}: {med.frequency}
                      </p>
                    )}
                    {med.prescribedBy && (
                      <p className="text-sm text-slate-500">
                        {t("sharePublic.prescribedBy")}: {med.prescribedBy}
                      </p>
                    )}
                    {med.notes && (
                      <p className="text-sm text-slate-400 mt-2 italic">{med.notes}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!isMedications && (
          <div className="space-y-4">
            <Section title={t("sharePublic.secPatientInfo")}>
              <Row label={t("sharePublic.bloodType")} value={content.bloodType} />
              <Row label={t("sharePublic.allergies")} value={content.allergies} />
              <Row
                label={t("sharePublic.weight")}
                value={content.weight ? `${content.weight} kg` : null}
              />
              <Row
                label={t("sharePublic.height")}
                value={content.height ? `${content.height} cm` : null}
              />
              <Row label={t("sharePublic.profession")} value={content.profession} />
            </Section>

            {content.chiefComplaint && (
              <Section title={t("sharePublic.reasonConsult")}>
                <p className="text-sm text-slate-700">{content.chiefComplaint}</p>
                {content.symptomDuration && (
                  <Row label={t("sharePublic.duration")} value={content.symptomDuration} />
                )}
                {content.painScale != null && (
                  <Row label={t("sharePublic.painScale")} value={`${content.painScale}/10`} />
                )}
              </Section>
            )}

            {Array.isArray(content.chronicConditions) && content.chronicConditions.length > 0 && (
              <Section title={t("sharePublic.chronicConditions")}>
                <div className="flex flex-wrap gap-2">
                  {content.chronicConditions.map((c) => (
                    <span
                      key={c}
                      className="bg-rose-50 text-rose-700 text-xs px-3 py-1.5 rounded-full"
                    >
                      {c}
                    </span>
                  ))}
                </div>
              </Section>
            )}

            {content.currentMedications && (
              <Section title={t("sharePublic.currentMeds")}>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {content.currentMedications}
                </p>
              </Section>
            )}

            {content.surgeries && (
              <Section title={t("sharePublic.surgeries")}>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">{content.surgeries}</p>
              </Section>
            )}

            {content.familyHistory && (
              <Section title={t("sharePublic.familyHistory")}>
                <p className="text-sm text-slate-700 whitespace-pre-wrap">
                  {content.familyHistory}
                </p>
              </Section>
            )}

            {(content.smoking || content.alcohol || content.exercise) && (
              <Section title={t("sharePublic.lifestyle")}>
                <Row label={t("sharePublic.smoking")} value={content.smoking} />
                <Row label={t("sharePublic.alcohol")} value={content.alcohol} />
                <Row label={t("sharePublic.exercise")} value={content.exercise} />
                <Row label={t("sharePublic.sleep")} value={content.sleep} />
              </Section>
            )}
          </div>
        )}

        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-start gap-3">
          <Shield size={16} className="text-blue-500 mt-0.5 shrink-0" />
          <p className="text-xs text-blue-700">{t("sharePublic.footer")}</p>
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
