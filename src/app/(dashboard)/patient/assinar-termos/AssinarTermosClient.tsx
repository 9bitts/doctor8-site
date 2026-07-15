"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardList,
  FileCheck2,
  Loader2,
  Share2,
  AlertCircle,
  AlertTriangle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import type { PatientPsychologyTermId, PatientTermFieldDef } from "@/lib/patient-psychology-terms";

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

interface ScaleOption {
  value: number;
  labelPt: string;
  labelEn: string;
  labelEs: string;
}

interface ScaleQuestion {
  id: string;
  textPt: string;
  textEn: string;
  textEs: string;
}

interface ScaleItem {
  id: string;
  namePt: string;
  nameEn: string;
  nameEs: string;
  descriptionPt: string;
  descriptionEn: string;
  descriptionEs: string;
  options: ScaleOption[];
  questions: ScaleQuestion[];
  status: {
    sent: boolean;
    documentId?: string;
    score?: number;
    interpretation?: { levelPt: string; levelEn: string; levelEs: string };
    sharedAt?: string | null;
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

type Mode = "list" | "term" | "scale";

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

function scaleName(s: ScaleItem, lang: string) {
  if (lang === "en") return s.nameEn;
  if (lang === "es") return s.nameEs;
  return s.namePt;
}

function scaleDesc(s: ScaleItem, lang: string) {
  if (lang === "en") return s.descriptionEn;
  if (lang === "es") return s.descriptionEs;
  return s.descriptionPt;
}

function qText(q: ScaleQuestion, lang: string) {
  if (lang === "en") return q.textEn;
  if (lang === "es") return q.textEs;
  return q.textPt;
}

function optLabel(o: ScaleOption, lang: string) {
  if (lang === "en") return o.labelEn;
  if (lang === "es") return o.labelEs;
  return o.labelPt;
}

function levelLabel(
  interp: { levelPt: string; levelEn: string; levelEs: string } | undefined,
  lang: string,
) {
  if (!interp) return "—";
  if (lang === "en") return interp.levelEn;
  if (lang === "es") return interp.levelEs;
  return interp.levelPt;
}

function optionLabel(f: PatientTermFieldDef, value: string, lang: string) {
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
  const [scales, setScales] = useState<ScaleItem[]>([]);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorsLoading, setDoctorsLoading] = useState(true);
  const [mode, setMode] = useState<Mode>("list");
  const [selectedTermId, setSelectedTermId] = useState<PatientPsychologyTermId | null>(null);
  const [selectedScaleId, setSelectedScaleId] = useState<string | null>(null);
  const [values, setValues] = useState<Record<string, string>>({});
  const [answers, setAnswers] = useState<Record<string, number | undefined>>({});
  const [professionalId, setProfessionalId] = useState("");
  const [shareAuthorized, setShareAuthorized] = useState(false);
  const [showFullText, setShowFullText] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [lastScore, setLastScore] = useState<{
    score: number;
    level: string;
    critical?: boolean;
  } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const [termsRes, scalesRes, doctorsRes] = await Promise.all([
        fetch("/api/patient/psychology-terms"),
        fetch("/api/patient/psychology-scales"),
        fetch("/api/patient/doctors"),
      ]);
      const termsData = await termsRes.json();
      const scalesData = await scalesRes.json();
      const doctorsData = await doctorsRes.json();
      if (!termsRes.ok) {
        setError(typeof termsData.error === "string" ? termsData.error : t("pat.terms.loadError"));
        return;
      }
      setProfile(termsData.profile);
      setTerms(termsData.terms || []);
      setScales(scalesData.scales || []);
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

  const selectedTerm = useMemo(
    () => terms.find((x) => x.id === selectedTermId) ?? null,
    [terms, selectedTermId],
  );

  const selectedScale = useMemo(
    () => scales.find((x) => x.id === selectedScaleId) ?? null,
    [scales, selectedScaleId],
  );

  const visibleFields = useMemo(() => {
    if (!selectedTerm) return [];
    return selectedTerm.fields.filter((f) => !f.guardianOnly || selectedTerm.requiresGuardian);
  }, [selectedTerm]);

  function backToList() {
    setMode("list");
    setSelectedTermId(null);
    setSelectedScaleId(null);
    setShareAuthorized(false);
    setShowFullText(false);
    setError("");
    setAnswers({});
  }

  function openTerm(term: TermItem) {
    setMode("term");
    setSelectedTermId(term.id);
    setSelectedScaleId(null);
    setError("");
    setSuccess("");
    setLastScore(null);
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

  function openScale(scale: ScaleItem) {
    setMode("scale");
    setSelectedScaleId(scale.id);
    setSelectedTermId(null);
    setError("");
    setSuccess("");
    setLastScore(null);
    setShareAuthorized(false);
    setAnswers({});
    if (doctors.length === 1) setProfessionalId(doctors[0].professionalId);
  }

  async function submitTerm() {
    if (!selectedTerm || !profile) return;
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
          termId: selectedTerm.id,
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
      backToList();
    } catch {
      setError(t("pat.terms.sendError"));
    } finally {
      setSubmitting(false);
    }
  }

  async function submitScale() {
    if (!selectedScale) return;
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
    const responses: number[] = [];
    for (const q of selectedScale.questions) {
      const v = answers[q.id];
      if (v === undefined) {
        setError(t("pat.tests.needAllAnswers"));
        return;
      }
      responses.push(v);
    }
    setSubmitting(true);
    try {
      const res = await fetch("/api/patient/psychology-scales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          scaleId: selectedScale.id,
          responses,
          professionalId,
          shareAuthorized: true,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(typeof data.error === "string" ? data.error : t("pat.tests.sendError"));
        return;
      }
      const level = levelLabel(data.interpretation, lang);
      setLastScore({
        score: data.score,
        level,
        critical: data.risk?.level === "critical",
      });
      setSuccess(t("pat.tests.sentOk"));
      await load();
      backToList();
    } catch {
      setError(t("pat.tests.sendError"));
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

      {error && mode === "list" && (
        <p className="text-sm text-red-600 flex items-center gap-2">
          <AlertCircle size={16} /> {error}
        </p>
      )}
      {success && (
        <div className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-xl px-3 py-2 space-y-1">
          <p className="flex items-center gap-2">
            <CheckCircle2 size={16} /> {success}
          </p>
          {lastScore && (
            <p className="text-slate-700 pl-6">
              {t("pat.tests.yourScore")}: <strong>{lastScore.score}</strong> — {lastScore.level}
            </p>
          )}
          {lastScore?.critical && (
            <p className="text-amber-900 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 mt-2 flex items-start gap-2">
              <AlertTriangle size={16} className="shrink-0 mt-0.5" />
              <span>{t("pat.tests.criticalHint")}</span>
            </p>
          )}
        </div>
      )}

      {mode === "list" && (
        <div className="space-y-8">
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <FileCheck2 size={18} className="text-emerald-600" />
              <h2 className="text-lg font-semibold text-slate-900">{t("pat.terms.sectionTerms")}</h2>
            </div>
            <p className="text-xs text-slate-500">{t("pat.terms.sectionTermsDesc")}</p>
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
          </section>

          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <ClipboardList size={18} className="text-sky-600" />
              <h2 className="text-lg font-semibold text-slate-900">{t("pat.terms.sectionTests")}</h2>
            </div>
            <p className="text-xs text-slate-500">{t("pat.terms.sectionTestsDesc")}</p>
            {scales.map((scale) => (
              <button
                key={scale.id}
                type="button"
                onClick={() => openScale(scale)}
                className="w-full text-left bg-white border border-slate-200 hover:border-sky-300 rounded-2xl p-4 transition"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-900 text-sm">{scaleName(scale, lang)}</p>
                    <p className="text-xs text-slate-500 mt-1">{scaleDesc(scale, lang)}</p>
                  </div>
                  {scale.status.sent ? (
                    <span className="shrink-0 text-xs font-medium text-sky-700 bg-sky-50 px-2.5 py-1 rounded-full">
                      {t("pat.terms.statusSent")}
                    </span>
                  ) : (
                    <span className="shrink-0 text-xs font-medium text-slate-600 bg-slate-100 px-2.5 py-1 rounded-full">
                      {t("pat.terms.statusPending")}
                    </span>
                  )}
                </div>
                {scale.status.sent && (
                  <p className="text-xs text-slate-400 mt-2">
                    {t("pat.tests.yourScore")}: {scale.status.score} — {levelLabel(scale.status.interpretation, lang)}
                    {scale.status.professionalName ? ` · ${scale.status.professionalName}` : ""}
                  </p>
                )}
              </button>
            ))}
          </section>
        </div>
      )}

      {mode === "term" && selectedTerm && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
          <button type="button" onClick={backToList} className="text-sm text-slate-500 hover:text-emerald-700 inline-flex items-center gap-1">
            <ArrowLeft size={14} /> {t("pat.terms.backToList")}
          </button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{termTitle(selectedTerm, lang)}</h2>
            <p className="text-sm text-slate-500 mt-1">{termSummary(selectedTerm, lang)}</p>
          </div>
          {selectedTerm.requiresGuardian && (
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
            <button type="button" onClick={() => setShowFullText((v) => !v)} className="text-sm text-emerald-700 font-medium">
              {showFullText ? t("pat.terms.hideFull") : t("pat.terms.showFull")}
            </button>
            {showFullText && (
              <div className="mt-2 text-xs text-slate-600 bg-slate-50 border border-slate-100 rounded-xl p-3 whitespace-pre-wrap leading-relaxed">
                {termSummary(selectedTerm, lang)}
                {"\n\n"}
                {t("pat.terms.fullBodyHint")}
              </div>
            )}
          </div>
          <ProfessionalPicker
            t={t}
            doctors={doctors}
            doctorsLoading={doctorsLoading}
            professionalId={professionalId}
            setProfessionalId={setProfessionalId}
          />
          <ShareCheckbox t={t} checked={shareAuthorized} onChange={setShareAuthorized} />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <SubmitCta t={t} submitting={submitting} disabled={doctors.length === 0} onClick={() => void submitTerm()} />
        </div>
      )}

      {mode === "scale" && selectedScale && (
        <div className="bg-white border border-slate-200 rounded-2xl p-5 space-y-5">
          <button type="button" onClick={backToList} className="text-sm text-slate-500 hover:text-sky-700 inline-flex items-center gap-1">
            <ArrowLeft size={14} /> {t("pat.terms.backToList")}
          </button>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{scaleName(selectedScale, lang)}</h2>
            <p className="text-sm text-slate-500 mt-1">{scaleDesc(selectedScale, lang)}</p>
          </div>
          {profile?.isMinor && (
            <div className="rounded-xl bg-amber-50 border border-amber-100 px-3 py-2 text-sm text-amber-900">
              {t("pat.tests.minorBanner")}
            </div>
          )}
          <div className="space-y-4">
            {selectedScale.questions.map((q, idx) => (
              <fieldset key={q.id} className="border border-slate-100 rounded-xl p-3">
                <legend className="text-sm font-medium text-slate-800 px-1">
                  {idx + 1}. {qText(q, lang)}
                </legend>
                <div className="mt-2 space-y-1.5">
                  {selectedScale.options.map((o) => (
                    <label key={o.value} className="flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                      <input
                        type="radio"
                        name={q.id}
                        checked={answers[q.id] === o.value}
                        onChange={() => setAnswers((a) => ({ ...a, [q.id]: o.value }))}
                        className="text-sky-600 focus:ring-sky-500"
                      />
                      {optLabel(o, lang)}
                    </label>
                  ))}
                </div>
              </fieldset>
            ))}
          </div>
          <ProfessionalPicker
            t={t}
            doctors={doctors}
            doctorsLoading={doctorsLoading}
            professionalId={professionalId}
            setProfessionalId={setProfessionalId}
          />
          <ShareCheckbox t={t} checked={shareAuthorized} onChange={setShareAuthorized} testMode />
          {error && <p className="text-sm text-red-600">{error}</p>}
          <SubmitCta t={t} submitting={submitting} disabled={doctors.length === 0} onClick={() => void submitScale()} testMode />
        </div>
      )}
    </div>
  );
}

function ProfessionalPicker({
  t,
  doctors,
  doctorsLoading,
  professionalId,
  setProfessionalId,
}: {
  t: (k: string) => string;
  doctors: Doctor[];
  doctorsLoading: boolean;
  professionalId: string;
  setProfessionalId: (v: string) => void;
}) {
  return (
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
  );
}

function ShareCheckbox({
  t,
  checked,
  onChange,
  testMode,
}: {
  t: (k: string) => string;
  checked: boolean;
  onChange: (v: boolean) => void;
  testMode?: boolean;
}) {
  return (
    <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="mt-1 rounded border-slate-300 text-emerald-600 focus:ring-emerald-500"
      />
      <span className="text-sm text-slate-700 leading-relaxed">
        {testMode ? t("pat.tests.shareCheckbox") : t("pat.terms.shareCheckbox")}
      </span>
    </label>
  );
}

function SubmitCta({
  t,
  submitting,
  disabled,
  onClick,
  testMode,
}: {
  t: (k: string) => string;
  submitting: boolean;
  disabled: boolean;
  onClick: () => void;
  testMode?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={submitting || disabled}
      className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl text-white font-semibold disabled:opacity-60 ${
        testMode ? "bg-sky-600 hover:bg-sky-700" : "bg-emerald-600 hover:bg-emerald-700"
      }`}
    >
      {submitting ? <Loader2 size={18} className="animate-spin" /> : <Share2 size={18} />}
      {testMode ? t("pat.tests.cta") : t("pat.terms.cta")}
    </button>
  );
}
