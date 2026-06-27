"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, ChevronRight, ChevronLeft, CheckCircle2 } from "lucide-react";
import { translate, Lang } from "@/lib/i18n/translations";
import {
  ANAMNESE_SERVICE_TYPES,
  INTEGRATIVE_RELIEF,
  MEDICO_SYMPTOMS,
  PSICO_SYMPTOMS,
  type AnamneseServiceType,
  type BasicNeedsData,
  type IdentificationData,
  type SpecialtyData,
} from "@/lib/humanitarian/anamnese";
import type { AnamneseDto, IntakePrefillDto } from "@/lib/humanitarian/intake";

type Props = {
  lang: Lang;
  campaignSlug: string;
};

const STEPS = ["identification", "services", "specialty", "basicNeeds", "consent"] as const;
type Step = (typeof STEPS)[number];

function t(lang: Lang, key: string) {
  return translate(lang, key);
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-xs text-slate-500 mb-1.5">{label}</label>
      {children}
    </div>
  );
}

const inp =
  "w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40";

export default function HumanitarianAnamneseForm({ lang, campaignSlug }: Props) {
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState<Step>("identification");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const [identification, setIdentification] = useState<IdentificationData>({});
  const [serviceTypes, setServiceTypes] = useState<AnamneseServiceType[]>([]);
  const [specialty, setSpecialty] = useState<SpecialtyData>({});
  const [basicNeeds, setBasicNeeds] = useState<BasicNeedsData>({
    needsMedicationHelp: false,
    needsShelterGuidance: false,
    separatedChildOrElderlyAlone: false,
  });
  const [consent, setConsent] = useState({ shareWithVolunteer: true, shareWithAngelVolunteer: false });
  const [additionalNotes, setAdditionalNotes] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/humanitarian/intake?campaignSlug=${campaignSlug}&full=1`,
      );
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || t(lang, "hum.anamnese.error"));
        setLoading(false);
        return;
      }
      const intake = data.intake;
      if (!intake?.triageValid) {
        window.location.href = `/humanitarian/${campaignSlug}/triage`;
        return;
      }
      if (intake.anamneseComplete) setDone(true);

      const prefill: IntakePrefillDto | undefined = intake.prefill;
      const saved: AnamneseDto | undefined = intake.anamnese;

      setIdentification({
        fullName: saved?.identification?.fullName || prefill?.fullName || "",
        ageOrDob: saved?.identification?.ageOrDob || prefill?.ageOrDob || "",
        sex: saved?.identification?.sex || prefill?.sex || "",
        phone: saved?.identification?.phone || prefill?.phone || "",
        email: saved?.identification?.email || prefill?.email || "",
        state: saved?.identification?.state || prefill?.state || "",
        municipality: saved?.identification?.municipality || prefill?.municipality || "",
        shelterStatus: saved?.identification?.shelterStatus,
        housingDamage: saved?.identification?.housingDamage,
        householdSize: saved?.identification?.householdSize || "",
        deathsOrMissing: saved?.identification?.deathsOrMissing ?? false,
        accessWaterFoodMeds: saved?.identification?.accessWaterFoodMeds,
      });
      setServiceTypes((saved?.serviceTypes || []) as AnamneseServiceType[]);
      setSpecialty(saved?.specialty || {});
      if (saved?.basicNeeds) setBasicNeeds(saved.basicNeeds);
      setAdditionalNotes(saved?.additionalNotes || "");
    } catch {
      setError(t(lang, "hum.page.networkError"));
    }
    setLoading(false);
  }, [campaignSlug, lang]);

  useEffect(() => {
    load();
  }, [load]);

  const stepIndex = STEPS.indexOf(step);
  const progress = ((stepIndex + 1) / STEPS.length) * 100;

  async function saveSection(section: Step) {
    setSaving(true);
    setError(null);
    let data: unknown;
    if (section === "identification") data = identification;
    else if (section === "services") data = { serviceTypes };
    else if (section === "specialty") data = specialty;
    else if (section === "basicNeeds") data = basicNeeds;
    else {
      data = {
        shareWithVolunteer: consent.shareWithVolunteer,
        shareWithAngelVolunteer: consent.shareWithAngelVolunteer,
        additionalNotes: additionalNotes.trim() || undefined,
      };
    }

    try {
      const res = await fetch("/api/humanitarian/intake", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignSlug, section, data }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.error || t(lang, "hum.anamnese.error"));
        setSaving(false);
        return;
      }
      if (section === "consent") {
        setDone(true);
      } else {
        const next = STEPS[stepIndex + 1];
        if (next) setStep(next);
      }
    } catch {
      setError(t(lang, "hum.page.networkError"));
    }
    setSaving(false);
  }

  function toggleService(s: AnamneseServiceType) {
    setServiceTypes((prev) =>
      prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s],
    );
  }

  function toggleMedicoSymptom(key: string) {
    setSpecialty((prev) => {
      const current = prev.medico?.physicalSymptoms || [];
      const next = current.includes(key) ? current.filter((x) => x !== key) : [...current, key];
      return { ...prev, medico: { ...prev.medico, physicalSymptoms: next } };
    });
  }

  function togglePsicoSymptom(key: string) {
    setSpecialty((prev) => {
      const current = prev.psicologo?.emotionalSymptoms || [];
      const next = current.includes(key) ? current.filter((x) => x !== key) : [...current, key];
      return { ...prev, psicologo: { ...prev.psicologo, emotionalSymptoms: next } };
    });
  }

  if (loading) {
    return (
      <div className="flex justify-center py-20">
        <Loader2 size={28} className="animate-spin text-emerald-400" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="text-center space-y-6 py-8">
        <CheckCircle2 size={48} className="text-emerald-400 mx-auto" />
        <div>
          <h1 className="text-xl font-bold text-white">{t(lang, "hum.anamnese.doneTitle")}</h1>
          <p className="text-slate-400 text-sm mt-2">{t(lang, "hum.anamnese.doneDesc")}</p>
        </div>
        <Link
          href={`/humanitarian/${campaignSlug}`}
          className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-emerald-500 text-white font-semibold text-sm"
        >
          {t(lang, "hum.anamnese.backToCare")}
          <ChevronRight size={16} />
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs text-emerald-300/80 uppercase tracking-wide font-medium">
          {t(lang, "hum.anamnese.eyebrow")}
        </p>
        <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">{t(lang, "hum.anamnese.title")}</h1>
        <p className="text-slate-400 text-sm mt-2">{t(lang, "hum.anamnese.subtitle")}</p>
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>{t(lang, `hum.anamnese.step.${step}`)}</span>
          <span>{stepIndex + 1}/{STEPS.length}</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div className="h-full bg-emerald-500 transition-all" style={{ width: `${progress}%` }} />
        </div>
      </div>

      {error && (
        <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {step === "identification" && (
        <div className="space-y-4">
          <Field label={t(lang, "hum.anamnese.fullName")}>
            <input className={inp} value={identification.fullName || ""} onChange={(e) => setIdentification((p) => ({ ...p, fullName: e.target.value }))} />
          </Field>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t(lang, "hum.anamnese.ageOrDob")}>
              <input className={inp} value={identification.ageOrDob || ""} onChange={(e) => setIdentification((p) => ({ ...p, ageOrDob: e.target.value }))} />
            </Field>
            <Field label={t(lang, "hum.anamnese.sex")}>
              <input className={inp} value={identification.sex || ""} onChange={(e) => setIdentification((p) => ({ ...p, sex: e.target.value }))} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t(lang, "hum.anamnese.phone")}>
              <input className={inp} value={identification.phone || ""} onChange={(e) => setIdentification((p) => ({ ...p, phone: e.target.value }))} />
            </Field>
            <Field label={t(lang, "hum.anamnese.email")}>
              <input className={inp} type="email" value={identification.email || ""} onChange={(e) => setIdentification((p) => ({ ...p, email: e.target.value }))} />
            </Field>
          </div>
          <div className="grid sm:grid-cols-2 gap-4">
            <Field label={t(lang, "hum.anamnese.state")}>
              <input className={inp} value={identification.state || ""} onChange={(e) => setIdentification((p) => ({ ...p, state: e.target.value }))} />
            </Field>
            <Field label={t(lang, "hum.anamnese.municipality")}>
              <input className={inp} value={identification.municipality || ""} onChange={(e) => setIdentification((p) => ({ ...p, municipality: e.target.value }))} />
            </Field>
          </div>
          <Field label={t(lang, "hum.anamnese.shelter")}>
            <div className="flex gap-2">
              {(["abrigo", "casa"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setIdentification((p) => ({ ...p, shelterStatus: v }))}
                  className={`flex-1 py-2 rounded-xl text-sm border ${identification.shelterStatus === v ? "border-emerald-400 bg-emerald-500/15 text-white" : "border-white/10 text-slate-400"}`}>
                  {t(lang, `hum.anamnese.shelter.${v}`)}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t(lang, "hum.anamnese.housing")}>
            <div className="grid gap-2">
              {(["destruida", "danificada", "intacta"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setIdentification((p) => ({ ...p, housingDamage: v }))}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm border ${identification.housingDamage === v ? "border-emerald-400 bg-emerald-500/15 text-white" : "border-white/10 text-slate-400"}`}>
                  {t(lang, `hum.anamnese.housing.${v}`)}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t(lang, "hum.anamnese.householdSize")}>
            <input className={inp} value={identification.householdSize || ""} onChange={(e) => setIdentification((p) => ({ ...p, householdSize: e.target.value }))} />
          </Field>
          <Field label={t(lang, "hum.anamnese.deathsOrMissing")}>
            <div className="flex gap-2">
              {[true, false].map((v) => (
                <button key={String(v)} type="button" onClick={() => setIdentification((p) => ({ ...p, deathsOrMissing: v }))}
                  className={`flex-1 py-2 rounded-xl text-sm border ${identification.deathsOrMissing === v ? "border-emerald-400 bg-emerald-500/15 text-white" : "border-white/10 text-slate-400"}`}>
                  {v ? t(lang, "hum.triage.yes") : t(lang, "hum.triage.no")}
                </button>
              ))}
            </div>
          </Field>
          <Field label={t(lang, "hum.anamnese.accessBasic")}>
            <div className="grid gap-2">
              {(["sim", "parcial", "nao"] as const).map((v) => (
                <button key={v} type="button" onClick={() => setIdentification((p) => ({ ...p, accessWaterFoodMeds: v }))}
                  className={`text-left px-4 py-2.5 rounded-xl text-sm border ${identification.accessWaterFoodMeds === v ? "border-emerald-400 bg-emerald-500/15 text-white" : "border-white/10 text-slate-400"}`}>
                  {t(lang, `hum.anamnese.access.${v}`)}
                </button>
              ))}
            </div>
          </Field>
        </div>
      )}

      {step === "services" && (
        <div className="grid gap-2">
          {ANAMNESE_SERVICE_TYPES.map((s) => (
            <button key={s} type="button" onClick={() => toggleService(s)}
              className={`text-left px-4 py-3 rounded-xl border text-sm ${serviceTypes.includes(s) ? "border-emerald-400 bg-emerald-500/15 text-white" : "border-white/10 text-slate-400"}`}>
              {t(lang, `hum.anamnese.service.${s}`)}
            </button>
          ))}
        </div>
      )}

      {step === "specialty" && (
        <div className="space-y-6">
          {serviceTypes.filter((s) => s !== "nao_sei").map((pool) => (
            <div key={pool} className="space-y-3 border-t border-white/10 pt-4">
              <h3 className="text-sm font-semibold text-slate-200">{t(lang, `hum.anamnese.service.${pool}`)}</h3>
              {pool === "medico" && (
                <>
                  <Field label={t(lang, "hum.anamnese.medico.reason")}>
                    <textarea className={inp} rows={2} value={specialty.medico?.chiefReason || ""}
                      onChange={(e) => setSpecialty((p) => ({ ...p, medico: { ...p.medico, chiefReason: e.target.value } }))} />
                  </Field>
                  <p className="text-xs text-slate-500">{t(lang, "hum.anamnese.medico.symptoms")}</p>
                  <div className="flex flex-wrap gap-2">
                    {MEDICO_SYMPTOMS.map((sym) => (
                      <button key={sym} type="button" onClick={() => toggleMedicoSymptom(sym)}
                        className={`px-3 py-1.5 rounded-lg text-xs border ${specialty.medico?.physicalSymptoms?.includes(sym) ? "border-emerald-400 bg-emerald-500/15 text-white" : "border-white/10 text-slate-400"}`}>
                        {t(lang, `hum.anamnese.symptom.${sym}`)}
                      </button>
                    ))}
                  </div>
                  <Field label={t(lang, "hum.anamnese.medico.meds")}>
                    <textarea className={inp} rows={2} value={specialty.medico?.medications || ""}
                      onChange={(e) => setSpecialty((p) => ({ ...p, medico: { ...p.medico, medications: e.target.value } }))} />
                  </Field>
                </>
              )}
              {pool === "psicologo" && (
                <>
                  <Field label={t(lang, "hum.anamnese.psico.scale")}>
                    <input type="range" min={0} max={10} className="w-full accent-emerald-500"
                      value={specialty.psicologo?.emotionalScale ?? 5}
                      onChange={(e) => setSpecialty((p) => ({ ...p, psicologo: { ...p.psicologo, emotionalScale: Number(e.target.value) } }))} />
                    <p className="text-xs text-slate-500 text-center mt-1">{specialty.psicologo?.emotionalScale ?? 5}/10</p>
                  </Field>
                  <div className="flex flex-wrap gap-2">
                    {PSICO_SYMPTOMS.map((sym) => (
                      <button key={sym} type="button" onClick={() => togglePsicoSymptom(sym)}
                        className={`px-3 py-1.5 rounded-lg text-xs border ${specialty.psicologo?.emotionalSymptoms?.includes(sym) ? "border-emerald-400 bg-emerald-500/15 text-white" : "border-white/10 text-slate-400"}`}>
                        {t(lang, `hum.anamnese.psicoSymptom.${sym}`)}
                      </button>
                    ))}
                  </div>
                </>
              )}
              {pool === "psicanalista" && (
                <Field label={t(lang, "hum.anamnese.psicanalista.reason")}>
                  <textarea className={inp} rows={3} value={specialty.psicanalista?.reason || ""}
                    onChange={(e) => setSpecialty((p) => ({ ...p, psicanalista: { ...p.psicanalista, reason: e.target.value } }))} />
                </Field>
              )}
              {pool === "fisioterapeuta" && (
                <Field label={t(lang, "hum.anamnese.fisio.pain")}>
                  <textarea className={inp} rows={2} value={specialty.fisioterapeuta?.painLocation || ""}
                    onChange={(e) => setSpecialty((p) => ({ ...p, fisioterapeuta: { ...p.fisioterapeuta, painLocation: e.target.value } }))} />
                </Field>
              )}
              {pool === "nutricionista" && (
                <Field label={t(lang, "hum.anamnese.nutri.meals")}>
                  <input className={inp} value={specialty.nutricionista?.mealsPerDay || ""}
                    onChange={(e) => setSpecialty((p) => ({ ...p, nutricionista: { ...p.nutricionista, mealsPerDay: e.target.value } }))} />
                </Field>
              )}
              {pool === "terapeuta_integrativo" && (
                <div className="flex flex-wrap gap-2">
                  {INTEGRATIVE_RELIEF.map((r) => (
                    <button key={r} type="button"
                      onClick={() => setSpecialty((p) => {
                        const cur = p.terapeuta_integrativo?.seeksReliefFor || [];
                        const next = cur.includes(r) ? cur.filter((x) => x !== r) : [...cur, r];
                        return { ...p, terapeuta_integrativo: { ...p.terapeuta_integrativo, seeksReliefFor: next } };
                      })}
                      className={`px-3 py-1.5 rounded-lg text-xs border ${specialty.terapeuta_integrativo?.seeksReliefFor?.includes(r) ? "border-emerald-400 bg-emerald-500/15 text-white" : "border-white/10 text-slate-400"}`}>
                      {t(lang, `hum.anamnese.integrative.${r}`)}
                    </button>
                  ))}
                </div>
              )}
              {pool === "cuidados_paliativos" && (
                <Field label={t(lang, "hum.anamnese.paliativos.symptoms")}>
                  <textarea className={inp} rows={2} value={specialty.cuidados_paliativos?.mainSymptoms || ""}
                    onChange={(e) => setSpecialty((p) => ({ ...p, cuidados_paliativos: { ...p.cuidados_paliativos, mainSymptoms: e.target.value } }))} />
                </Field>
              )}
            </div>
          ))}
          {serviceTypes.length === 0 || serviceTypes.every((s) => s === "nao_sei") ? (
            <p className="text-sm text-slate-500">{t(lang, "hum.anamnese.specialtySkip")}</p>
          ) : null}
        </div>
      )}

      {step === "basicNeeds" && (
        <div className="space-y-4">
          {(
            [
              { key: "needsMedicationHelp" as const, label: "hum.anamnese.needs.meds" },
              { key: "needsShelterGuidance" as const, label: "hum.anamnese.needs.shelter" },
              { key: "separatedChildOrElderlyAlone" as const, label: "hum.anamnese.needs.separated" },
            ] as const
          ).map((q) => (
            <div key={q.key}>
              <p className="text-sm text-slate-300 mb-2">{t(lang, q.label)}</p>
              <div className="flex gap-2">
                {[true, false].map((v) => (
                  <button key={String(v)} type="button" onClick={() => setBasicNeeds((p) => ({ ...p, [q.key]: v }))}
                    className={`flex-1 py-2 rounded-xl text-sm border ${basicNeeds[q.key] === v ? "border-emerald-400 bg-emerald-500/15 text-white" : "border-white/10 text-slate-400"}`}>
                    {v ? t(lang, "hum.triage.yes") : t(lang, "hum.triage.no")}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {step === "consent" && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500 bg-white/5 border border-white/10 rounded-xl px-3 py-2">
            {t(lang, "hum.anamnese.tcleAlreadySigned")}
          </p>
          <label className="flex items-start gap-3 p-4 rounded-xl border border-white/10 cursor-pointer">
            <input type="checkbox" checked={consent.shareWithVolunteer}
              onChange={(e) => setConsent((p) => ({ ...p, shareWithVolunteer: e.target.checked }))}
              className="mt-1" />
            <span className="text-sm text-slate-300">{t(lang, "hum.anamnese.consentShare")}</span>
          </label>
          <label className="flex items-start gap-3 p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 cursor-pointer">
            <input type="checkbox" checked={consent.shareWithAngelVolunteer}
              onChange={(e) => setConsent((p) => ({ ...p, shareWithAngelVolunteer: e.target.checked }))}
              className="mt-1" />
            <span className="text-sm text-slate-300">{t(lang, "hum.anamnese.consentAngel")}</span>
          </label>
          <Field label={t(lang, "hum.anamnese.notes")}>
            <textarea className={inp} rows={3} value={additionalNotes}
              onChange={(e) => setAdditionalNotes(e.target.value)} />
          </Field>
        </div>
      )}

      <div className="flex gap-3 pt-2">
        {stepIndex > 0 && (
          <button type="button" onClick={() => setStep(STEPS[stepIndex - 1])}
            className="flex items-center justify-center gap-1 px-4 py-3 rounded-xl border border-white/10 text-slate-400 text-sm">
            <ChevronLeft size={16} /> {t(lang, "hum.triage.back")}
          </button>
        )}
        <button type="button" disabled={saving} onClick={() => saveSection(step)}
          className="flex-1 py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50 text-sm">
          {saving ? <Loader2 size={18} className="animate-spin" /> : (
            step === "consent" ? t(lang, "hum.anamnese.submit") : (
              <>{t(lang, "hum.anamnese.saveContinue")} <ChevronRight size={16} /></>
            )
          )}
        </button>
      </div>

      <p className="text-center text-xs text-slate-500">
        <Link href={`/humanitarian/${campaignSlug}`} className="underline hover:text-slate-300">
          {t(lang, "hum.anamnese.skipForNow")}
        </Link>
      </p>
    </div>
  );
}
