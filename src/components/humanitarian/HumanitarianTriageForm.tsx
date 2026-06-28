"use client";

import { useMemo, useState } from "react";
import { Loader2, AlertTriangle, ChevronRight } from "lucide-react";
import { translate, Lang } from "@/lib/i18n/translations";
import type { HumanitarianTriageData } from "@/lib/humanitarian/triage";
import HumanitarianOfflineBanner from "@/components/humanitarian/HumanitarianOfflineBanner";
import { humanitarianDraftKey } from "@/lib/humanitarian/offline-draft";
import { enqueueHumanitarianSubmit } from "@/lib/humanitarian/outbox";
import { useHumanitarianDraft } from "@/hooks/useHumanitarianDraft";

type Props = {
  lang: Lang;
  campaignSlug: string;
  onComplete: () => void;
};

type TriageFormData = Omit<HumanitarianTriageData, "deviceOwnership"> & {
  deviceOwnership?: HumanitarianTriageData["deviceOwnership"];
};

const EMPTY: TriageFormData = {
  pregnantOrLactating: false,
  age65Plus: false,
  disabilityOrReducedMobility: false,
  childUnder12Responsible: false,
  chronicDiseaseNeedsMeds: false,
  lostMedicationAccess: false,
  walking: "sim",
  breathing: "normal",
  consciousness: "alerta",
  activeBleeding: false,
  chestPainOrSevereDyspnea: false,
  feverOrGi: false,
  headTrauma: false,
  headTraumaDescription: "",
  selfHarmThoughts: false,
  quickComplaint: "",
  deviceOwnership: undefined,
};

function t(lang: Lang, key: string) {
  return translate(lang, key);
}

function YesNo({
  lang,
  value,
  onChange,
  dark = true,
}: {
  lang: Lang;
  value: boolean;
  onChange: (v: boolean) => void;
  dark?: boolean;
}) {
  const base = dark
    ? "flex-1 py-2.5 rounded-xl text-sm font-semibold border transition"
    : "flex-1 py-2.5 rounded-xl text-sm font-semibold border transition";
  const active = dark
    ? "border-emerald-400 bg-emerald-500/20 text-white"
    : "border-emerald-500 bg-emerald-50 text-emerald-800";
  const idle = dark
    ? "border-white/10 bg-slate-900/40 text-slate-400 hover:border-white/20"
    : "border-slate-200 bg-white text-slate-600 hover:border-slate-300";

  return (
    <div className="flex gap-2">
      {([true, false] as const).map((v) => (
        <button
          key={String(v)}
          type="button"
          onClick={() => onChange(v)}
          className={`${base} ${value === v ? active : idle}`}
        >
          {v ? t(lang, "hum.triage.yes") : t(lang, "hum.triage.no")}
        </button>
      ))}
    </div>
  );
}

export default function HumanitarianTriageForm({ lang, campaignSlug, onComplete }: Props) {
  const draftKey = humanitarianDraftKey("triage", campaignSlug);
  const { data, setData, restored, clearDraft } = useHumanitarianDraft(draftKey, EMPTY);
  const [step, setStep] = useState<1 | 2>(1);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const progress = step === 1 ? 50 : 100;

  const vulnerabilityQuestions: {
    key: keyof HumanitarianTriageData;
    labelKey: string;
  }[] = useMemo(
    () => [
      { key: "pregnantOrLactating", labelKey: "hum.triage.q.pregnant" },
      { key: "age65Plus", labelKey: "hum.triage.q.age65" },
      { key: "disabilityOrReducedMobility", labelKey: "hum.triage.q.disability" },
      { key: "childUnder12Responsible", labelKey: "hum.triage.q.childUnder12" },
      { key: "chronicDiseaseNeedsMeds", labelKey: "hum.triage.q.chronic" },
      { key: "lostMedicationAccess", labelKey: "hum.triage.q.lostMeds" },
    ],
    [],
  );

  function patch<K extends keyof TriageFormData>(key: K, value: TriageFormData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  async function submit() {
    if (!data.deviceOwnership) {
      setError(t(lang, "hum.triage.deviceRequired"));
      return;
    }
    const payload: HumanitarianTriageData = {
      ...data,
      deviceOwnership: data.deviceOwnership,
      headTraumaDescription: data.headTrauma ? data.headTraumaDescription?.trim() || undefined : undefined,
    };

    if (typeof navigator !== "undefined" && !navigator.onLine) {
      await enqueueHumanitarianSubmit({
        url: "/api/humanitarian/intake",
        method: "POST",
        body: { campaignSlug, triage: payload },
      });
      setError(t(lang, "hum.offline.queuedSubmit"));
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/humanitarian/intake", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ campaignSlug, triage: payload }),
      });
      const body = await res.json();
      if (!res.ok) {
        setError(body.message || body.error || t(lang, "hum.triage.error"));
        setSaving(false);
        return;
      }
      clearDraft();
      onComplete();
    } catch {
      setError(t(lang, "hum.page.networkError"));
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <HumanitarianOfflineBanner lang={lang} draftRestored={restored} />
      <div>
        <p className="text-xs text-rose-300/80 uppercase tracking-wide font-medium">
          {t(lang, "hum.triage.eyebrow")}
        </p>
        <h1 className="text-xl sm:text-2xl font-bold text-white mt-1">{t(lang, "hum.triage.title")}</h1>
        <p className="text-slate-400 text-sm mt-2 leading-relaxed">{t(lang, "hum.triage.subtitle")}</p>
      </div>

      <div>
        <div className="flex justify-between text-xs text-slate-500 mb-1.5">
          <span>{t(lang, "hum.triage.progress")}</span>
          <span>{t(lang, "hum.triage.estTime")}</span>
        </div>
        <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
          <div
            className="h-full bg-emerald-500 transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {error && (
        <p className="text-sm text-rose-300 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3">
          {error}
        </p>
      )}

      {step === 1 ? (
        <div className="space-y-5">
          <h2 className="text-sm font-semibold text-slate-200">{t(lang, "hum.triage.block2Title")}</h2>
          {vulnerabilityQuestions.map((q) => (
            <div key={q.key} className="space-y-2">
              <p className="text-sm text-slate-300">{t(lang, q.labelKey)}</p>
              <YesNo
                lang={lang}
                value={data[q.key] as boolean}
                onChange={(v) => patch(q.key, v as HumanitarianTriageData[typeof q.key])}
              />
            </div>
          ))}
          <div className="space-y-2 pt-2 border-t border-white/10">
            <p className="text-sm text-slate-300">{t(lang, "hum.triage.q.deviceOwnership")}</p>
            <p className="text-xs text-slate-500">{t(lang, "hum.triage.q.deviceOwnershipHint")}</p>
            <div className="flex flex-col sm:flex-row gap-2">
              {(["proprio", "emprestado"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => patch("deviceOwnership", opt)}
                  className={`flex-1 py-2.5 rounded-xl text-sm font-semibold border transition ${
                    data.deviceOwnership === opt
                      ? "border-emerald-400 bg-emerald-500/20 text-white"
                      : "border-white/10 bg-slate-900/40 text-slate-400 hover:border-white/20"
                  }`}
                >
                  {t(lang, `hum.triage.device.${opt}`)}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={() => {
              if (!data.deviceOwnership) {
                setError(t(lang, "hum.triage.deviceRequired"));
                return;
              }
              setError(null);
              setStep(2);
            }}
            className="w-full py-3.5 rounded-xl bg-white/10 hover:bg-white/15 text-white font-semibold flex items-center justify-center gap-2"
          >
            {t(lang, "hum.triage.next")}
            <ChevronRight size={18} />
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          <h2 className="text-sm font-semibold text-slate-200">{t(lang, "hum.triage.block3Title")}</h2>

          <div className="space-y-2">
            <p className="text-sm text-slate-300">{t(lang, "hum.triage.q.walking")}</p>
            <div className="grid gap-2">
              {(["sim", "dificuldade", "nao"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => patch("walking", opt)}
                  className={`text-left px-4 py-3 rounded-xl border text-sm transition ${
                    data.walking === opt
                      ? "border-emerald-400 bg-emerald-500/15 text-white"
                      : "border-white/10 bg-slate-900/40 text-slate-400"
                  }`}
                >
                  {t(lang, `hum.triage.walking.${opt}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-300">{t(lang, "hum.triage.q.breathing")}</p>
            <div className="grid gap-2">
              {(["normal", "ofegante", "muito_dificil"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => patch("breathing", opt)}
                  className={`text-left px-4 py-3 rounded-xl border text-sm transition ${
                    data.breathing === opt
                      ? "border-emerald-400 bg-emerald-500/15 text-white"
                      : "border-white/10 bg-slate-900/40 text-slate-400"
                  }`}
                >
                  {t(lang, `hum.triage.breathing.${opt}`)}
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <p className="text-sm text-slate-300">{t(lang, "hum.triage.q.consciousness")}</p>
            <div className="grid gap-2">
              {(["alerta", "confuso", "sonolento"] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => patch("consciousness", opt)}
                  className={`text-left px-4 py-3 rounded-xl border text-sm transition ${
                    data.consciousness === opt
                      ? "border-emerald-400 bg-emerald-500/15 text-white"
                      : "border-white/10 bg-slate-900/40 text-slate-400"
                  }`}
                >
                  {t(lang, `hum.triage.consciousness.${opt}`)}
                </button>
              ))}
            </div>
          </div>

          {(
            [
              { key: "activeBleeding" as const, labelKey: "hum.triage.q.bleeding" },
              { key: "chestPainOrSevereDyspnea" as const, labelKey: "hum.triage.q.chestPain" },
              { key: "feverOrGi" as const, labelKey: "hum.triage.q.feverGi" },
              { key: "headTrauma" as const, labelKey: "hum.triage.q.headTrauma" },
            ] as const
          ).map((q) => (
            <div key={q.key} className="space-y-2">
              <p className="text-sm text-slate-300">{t(lang, q.labelKey)}</p>
              <YesNo lang={lang} value={data[q.key]} onChange={(v) => patch(q.key, v)} />
            </div>
          ))}

          {data.headTrauma && (
            <div>
              <label className="block text-xs text-slate-500 mb-1.5">{t(lang, "hum.triage.q.headTraumaDesc")}</label>
              <textarea
                value={data.headTraumaDescription || ""}
                onChange={(e) => patch("headTraumaDescription", e.target.value)}
                rows={2}
                className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                placeholder={t(lang, "hum.triage.headTraumaPlaceholder")}
              />
            </div>
          )}

          <div className="rounded-xl border border-white/10 bg-slate-900/50 p-4 space-y-2">
            <label className="text-sm text-slate-200 font-medium">
              {t(lang, "hum.triage.quickComplaint")}
            </label>
            <p className="text-xs text-slate-500">{t(lang, "hum.triage.quickComplaintHint")}</p>
            <textarea
              value={data.quickComplaint || ""}
              onChange={(e) => patch("quickComplaint", e.target.value.slice(0, 500))}
              rows={3}
              maxLength={500}
              className="w-full bg-slate-900 border border-white/10 rounded-xl px-3 py-2.5 text-sm text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
              placeholder={t(lang, "hum.triage.quickComplaintPlaceholder")}
            />
            <p className="text-[10px] text-slate-500 text-right">{(data.quickComplaint || "").length}/500</p>
          </div>

          <div className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-4 space-y-2">
            <p className="text-sm text-rose-100 font-medium flex items-center gap-2">
              <AlertTriangle size={16} className="shrink-0" />
              {t(lang, "hum.triage.q.selfHarm")}
            </p>
            <YesNo lang={lang} value={data.selfHarmThoughts} onChange={(v) => patch("selfHarmThoughts", v)} />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="flex-1 py-3 rounded-xl border border-white/10 text-slate-400 text-sm"
            >
              {t(lang, "hum.triage.back")}
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={saving}
              className="flex-[2] py-3.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50"
            >
              {saving ? <Loader2 size={18} className="animate-spin" /> : t(lang, "hum.triage.submit")}
            </button>
          </div>
        </div>
      )}

      <p className="text-xs text-slate-500 text-center leading-relaxed">{t(lang, "hum.page.disclaimer")}</p>
    </div>
  );
}
