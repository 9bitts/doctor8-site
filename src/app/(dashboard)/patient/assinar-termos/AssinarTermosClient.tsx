"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Share2,
  AlertCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import {
  type PatientPsychologyTermId,
  type PatientTermFieldDef,
} from "@/lib/patient-psychology-terms";

interface Doctor {
  professionalId: string;
  userId: string;
  name: string;
  specialty: string;
}

interface TermItem {
  id: PatientPsychologyTermId;
  audience: string;
  titlePt: string;
  titleEn: string;
  titleEs: string;
  summaryPt: string;
  summaryEn: string;
  summaryEs: string;
  requiresGuardian: boolean;
  fields: PatientTermFieldDef[];
  status: {
    sent: boolean;
    documentId?: string;
    sharedAt?: string | null;
    professionalId?: string | null;
    professionalName?: string | null;
  };
}

interface Profile {
  fullName: string;
  dateOfBirth: string | null;
  age: number | null;
  isMinor: boolean;
  phone: string | null;
  cpf: string | null;
  cityState: string | null;
}

function fieldLabel(f: PatientTermFieldDef, lang: string) {
  if (lang === "en") return f.labelEn;
  if (lang === "es") return f.labelEs;
  return f.labelPt;
}

function termTitle(t: TermItem, lang: string) {
  if (lang === "en") return t.titleEn;
  if (lang === "es") return t.titleEs;
  return t.titlePt;
}

function termSummary(t: TermItem, lang: string) {
  if (lang === "en") return t.summaryEn;
  if (lang === "es") return t.summaryEs;
  return t.summaryPt;
}

function optionLabel(
  f: PatientTermFieldDef,
  value: string,
  lang: string,
) {
  const opt = f.options?.find((o) => o.value === value);
  if (!opt) return value;
  if (lang === "en") return opt.labelEn;
  if (lang === "es") return opt.labelEs;
  return opt.labelPt;
}

export default function AssinarTermosClient() {
  const { t, lang } = useI18n();
  const [loading, setLoading] = useState(true);
  const [terms, setTerms] = useState<TermItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<PatientPsychologyTermId | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [professionalId, setProfessionalId] = useState("");
  const [shareAuthorized, setShareAuthorized] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [termsRes, doctorsRes] = await Promise.all([
        fetch("/api/patient/psychology-terms"),
        fetch("/api/patient/doctors"),
      ]);
      const termsData = await termsRes.json();
      const doctorsData = await doctorsRes.json();
      if (!termsRes.ok) {
        setError(typeof termsData.error === "string" ? termsData.error : t("pat.terms.loadError"));
        return;
      }
      setProfile(termsData.profile);
      setTerms(termsData.terms || []);
      setDoctors(doctorsData.doctors || []);
    } catch {
      setError(t("pat.terms.loadError"));
    } finally {
      setLoading(false);
      setDoctorsLoading(false);
    }
  }, [t]);

  useEffect(() => {
    void load();
  }, [load]);

  const selected = useMemo(
    () => terms.find((x) => x.id === selectedId) ?? null,
    [terms, selectedId],
  );

  const visibleFields = useMemo(() => {
    if (!selected) return [];
    return selected.fields.filter((f) => !f.guardianOnly || selected.requiresGuardian);
  }, [selected]);

  function openTerm(term: TermItem) {
    setSelectedId(term.id);
    setError("");
    setSuccess("");
    setShareAuthorized(false);
    setShowFullText(false);
    const next: Record<string, string> = {};
    if (profile) {
      next.patientFullName = profile.fullName || "";
      next.patientCpf = profile.cpf || "";
      next.patientDob = profile.dateOfBirth || "";
      next.patientPhone = profile.phone || "";
      next.patientCity = profile.cityState || "";
      next.adolescentName = profile.fullName || "";
      next.adolescentDob = profile.dateOfBirth || "";
    }
    setValues(next);
    if (doctors.length === 1) setProfessionalId(doctors[0].professionalId);
  }

  async function submit() {
    if (!selected || !profile) return;
    setError("");
    setSuccess("");
    if (!shareAuthorized) {
      setError(t("pat.terms.needAuth"));
      return;
    }
    if (!professionalId) {
      setError(t("pat.terms.needProfessional"));
      return;
    }
    for (const f of visibleFields) {
      if (f.required && !String(values[f.key] ?? "").trim()) {
        setError(`${t("pat.terms.needField")}: ${fieldLabel(f, lang)}`);
        return;
      }
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/patient/psychology-terms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          termId: selected.id,
          professionalId,
          shareAuthorized: true,
          fields: values,
          lang: lang === "en" || lang === "es" ? lang : "pt",
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("pat.terms.sendError"));
        return;
      }
      setSuccess(t("pat.terms.sentOk"));
      await load();
      setSelectedId(null);
    } catch {
      setError(t("pat.terms.sendError"));
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-emerald-600" size={28} />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <Link href="/patient" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-emerald-700 mb-2">
          <ArrowLeft size={16} /> {t("pat.terms.back")}
        </Link>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <FileCheck2 className="text-emerald-600" size={26} />
          {t("pat.terms.title")}
        </h1>
        <p className="text-sm text-slate-500 mt-1">{t("pat.terms.desc")}</p>
        {profile?.isMinor && (
          <p className="mt-3 text-sm text-amber-800 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
            {t("pat.terms.minorHint")}
          </p>
        )}
        {profile && profile.age === null && (
          <p className="mt-3 text-sm text-slate-600 bg-slate-50 border border-slate-100 rounded-xl px-3 py-2">
            {t("pat.terms.dobHint")}{" "}
            <Link href="/patient/account" className="underline font-medium text-emerald-700">
              {t("nav.account")}
            </Link>
          </p>
        )}
      </div>

      {error && !selected && (
        <p className="text-sm text-red-600 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </p>
      )}
      {success && (
        <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 flex items-center gap-2">
          <CheckCircle2 size={16} /> {success}
        </p>
      )}

      {!selected ? (
        <div className="space-y-3">
          {terms.length === 0 ? (
            <p className="text-sm text-slate-500">{t("pat.terms.empty")}</p>
          ) : (
            terms.map((term) => (
              <button
                key={term.id}
                type="button"
                onClick={() => openTerm(term)}
                className="w-full text-left bg-white border border-slate-200 hover:border-emerald-300 rounded-2xl p-4 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{termTitle(term, lang)}</p>
                    <p className="text-xs text-slate-500 mt-1">{termSummary(term, lang)}</p>
                  </div>
                  {term.status.sent ? (
                    <span className="shrink-0 text-xs font-medium text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-full">
                      {t("pat.terms.statusSent")}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                      {t("pat.terms.statusPending")}
                    </span>
                  )}
                </div>
                {term.status.sent && term.status.professionalName && (
                  <p className="text-xs text-slate-400 mt-2">
                    {t("pat.terms.sentTo")}: {term.status.professionalName}
                    {term.status.sharedAt
                      ? ` · ${new Date(term.status.sharedAt).toLocaleDateString(lang === "en" ? "en-US" : lang === "es" ? "es" : "pt-BR")}`
                      : ""}
                  </p>
                )}
              </button>
            ))
          )}
        </div>
      ) : (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
          <button
            type="button"
            onClick={() => setSelectedId(null)}
            className="text-sm text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1"
          >
            <ArrowLeft size={14} /> {t("pat.terms.backToList")}
          </button>

          <div>
            <h2 className="text-lg font-semibold text-slate-900">{termTitle(selected, lang)}</h2>
            <p className="text-sm text-slate-500 mt-1">{termSummary(selected, lang)}</p>
          </div>

          {selected.requiresGuardian && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-amber-900">
              {t("pat.terms.guardianBanner")}
            </div>
          )}

          <div className="space-y-3">
            {visibleFields.map((f) => (
              <div key={f.key}>
                <label className="text-sm font-medium text-slate-800">
                  {fieldLabel(f, lang)}
                  {f.required ? " *" : ""}
                </label>
                {f.kind === "select" ? (
                  <select
                    value={values[f.key] || ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                  >
                    <option value="">{t("pat.terms.selectOption")}</option>
                    {(f.options || []).map((o) => (
                      <option key={o.value} value={o.value}>
                        {optionLabel(f, o.value, lang)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type={f.kind === "date" ? "date" : "text"}
                    value={values[f.key] || ""}
                    onChange={(e) => setValues((v) => ({ ...v, [f.key]: e.target.value }))}
                    className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
                  />
                )}
              </div>
            ))}
          </div>

          <div>
            <button
              type="button"
              onClick={() => setShowFullText((v) => !v)}
              className="text-sm text-emerald-700 font-medium"
            >
              {showFullText ? t("pat.terms.hideFull") : t("pat.terms.showFull")}
            </button>
            {showFullText && (
              <div className="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 whitespace-pre-wrap leading-relaxed">
                {termSummary(selected, lang)}
                {"\n\n"}
                {t("pat.terms.fullBodyHint")}
              </div>
            )}
          </div>

          <div>
            <label className="text-sm font-medium text-slate-800">{t("pat.terms.professional")} *</label>
            {doctorsLoading ? (
              <p className="text-sm text-slate-500 mt-2 flex items-center gap-2">
                <Loader2 size={14} className="animate-spin" /> {t("common.loading")}
              </p>
            ) : doctors.length === 0 ? (
              <p className="text-sm text-amber-800 mt-2 bg-amber-50 border border-amber-100 rounded-xl px-3 py-2">
                {t("pat.terms.noDoctors")}{" "}
                <Link href="/patient/appointments" className="underline font-medium">
                  {t("nav.appointments")}
                </Link>
              </p>
            ) : (
              <select
                value={professionalId}
                onChange={(e) => setProfessionalId(e.target.value)}
                className="mt-1.5 w-full px-3 py-2.5 rounded-xl border border-slate-200 text-sm"
              >
                <option value="">{t("pat.terms.selectProfessional")}</option>
                {doctors.map((d) => (
                  <option key={d.professionalId} value={d.professionalId}>
                    {d.name} ({d.specialty})
                  </option>
                ))}
              </select>
            )}
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 cursor-pointer">
            <input
              type="checkbox"
              checked={shareAuthorized}
              onChange={(e) => setShareAuthorized(e.target.checked)}
              className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
            />
            <span className="text-sm text-slate-700 leading-relaxed">{t("pat.terms.shareCheckbox")}</span>
          </label>

          {error && selected && (
            <p className="text-sm text-red-600">{error}</p>
          )}

          <button
            type="button"
            onClick={() => void submit()}
            disabled={submitting || doctors.length === 0}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-emerald-600 text-white font-semibold hover:bg-emerald-700 disabled:opacity-60"
          >
            {submitting ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
            {t("pat.terms.cta")}
          </button>
        </div>
      )}
    </div>
  );
}
