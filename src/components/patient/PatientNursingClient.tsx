"use client";

import { useEffect, useState } from "react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { Activity, BookOpen, ClipboardList, Loader2 } from "lucide-react";
import { NURSING_INTAKE_QUESTIONS } from "@/lib/nursing/intake-questions";

type Chart = {
  id: string;
  professional: { firstName: string; lastName: string };
};

type MonitoringEntry = {
  id: string;
  symptoms: string;
  severity: number | null;
  recordedAt: string;
};

export default function PatientNursingClient() {
  const { t } = useI18n();
  const [tab, setTab] = useState<"intake" | "monitoring" | "education">("intake");
  const [charts, setCharts] = useState<Chart[]>([]);
  const [chartId, setChartId] = useState("");
  const [pending, setPending] = useState<{ id: string; chartId: string; professionalName: string; sentAt: string }[]>([]);
  const [activeIntake, setActiveIntake] = useState<string | null>(null);
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, string>>({});
  const [entries, setEntries] = useState<MonitoringEntry[]>([]);
  const [symptoms, setSymptoms] = useState("");
  const [severity, setSeverity] = useState(5);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  async function loadCharts() {
    const res = await fetch("/api/patient/nursing/charts");
    const data = await res.json();
    const list: Chart[] = data.charts || [];
    setCharts(list);
    if (!chartId && list[0]) setChartId(list[0].id);
  }

  async function loadMonitoring(id: string) {
    if (!id) return;
    const res = await fetch(`/api/patient/nursing/monitoring?chartId=${encodeURIComponent(id)}`);
    const data = await res.json();
    setEntries(data.entries || []);
  }

  useEffect(() => {
    (async () => {
      setLoading(true);
      await Promise.all([
        loadCharts(),
        fetch("/api/patient/nursing/intake").then((r) => r.json()).then((d) => setPending(d.forms || [])),
      ]);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    if (chartId) loadMonitoring(chartId);
  }, [chartId]);

  async function openIntake(id: string) {
    setActiveIntake(id);
    const res = await fetch(`/api/patient/nursing/intake/${id}`);
    const data = await res.json();
    setIntakeAnswers({});
    if (data.responses) {
      const answers: Record<string, string> = {};
      for (const [k, v] of Object.entries(data.responses)) answers[k] = String(v);
      setIntakeAnswers(answers);
    }
  }

  async function submitIntake() {
    if (!activeIntake) return;
    setSaving(true);
    try {
      await fetch(`/api/patient/nursing/intake/${activeIntake}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ responses: intakeAnswers }),
      });
      setActiveIntake(null);
      const res = await fetch("/api/patient/nursing/intake");
      const data = await res.json();
      setPending(data.forms || []);
    } finally {
      setSaving(false);
    }
  }

  async function submitMonitoring(e: React.FormEvent) {
    e.preventDefault();
    if (!chartId || !symptoms.trim()) return;
    setSaving(true);
    try {
      await fetch("/api/patient/nursing/monitoring", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ chartId, symptoms: symptoms.trim(), severity }),
      });
      setSymptoms("");
      await loadMonitoring(chartId);
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="animate-spin text-rose-500" size={28} />
      </div>
    );
  }

  if (charts.length === 0) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-12 text-center">
        <h1 className="text-2xl font-bold text-slate-900">{t("nurse.patient.title")}</h1>
        <p className="text-slate-600 mt-4">{t("nurse.patient.noNurse")}</p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{t("nurse.patient.title")}</h1>
        <p className="text-slate-600 mt-1">{t("nurse.patient.subtitle")}</p>
      </div>

      {charts.length > 1 && (
        <select
          value={chartId}
          onChange={(e) => setChartId(e.target.value)}
          className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
        >
          {charts.map((c) => (
            <option key={c.id} value={c.id}>
              {c.professional.firstName} {c.professional.lastName}
            </option>
          ))}
        </select>
      )}

      <div className="flex gap-2">
        {([
          { id: "intake" as const, icon: ClipboardList, label: t("nurse.patient.tabIntake") },
          { id: "monitoring" as const, icon: Activity, label: t("nurse.patient.tabMonitoring") },
          { id: "education" as const, icon: BookOpen, label: t("nurse.patient.tabEducation") },
        ]).map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex items-center gap-1.5 rounded-full px-4 py-2 text-sm font-medium border ${
              tab === item.id
                ? "bg-rose-600 text-white border-rose-600"
                : "bg-white text-slate-600 border-slate-200"
            }`}
          >
            <item.icon size={14} />
            {item.label}
          </button>
        ))}
      </div>

      {tab === "intake" && (
        <div className="space-y-4">
          {activeIntake ? (
            <div className="rounded-2xl border border-slate-200 bg-white p-5 space-y-4">
              {NURSING_INTAKE_QUESTIONS.map((q) => (
                <div key={q.id}>
                  <label className="text-sm font-medium text-slate-700">{t(q.labelKey)}</label>
                  {q.type === "select" && q.options ? (
                    <select
                      value={intakeAnswers[q.id] ?? ""}
                      onChange={(e) => setIntakeAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      {q.options.map((o) => (
                        <option key={o.value} value={o.value}>{t(o.labelKey)}</option>
                      ))}
                    </select>
                  ) : q.type === "yesno" ? (
                    <select
                      value={intakeAnswers[q.id] ?? ""}
                      onChange={(e) => setIntakeAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    >
                      <option value="">—</option>
                      <option value="yes">{t("nurse.yes")}</option>
                      <option value="no">{t("nurse.no")}</option>
                    </select>
                  ) : (
                    <input
                      type={q.type === "number" ? "number" : "text"}
                      value={intakeAnswers[q.id] ?? ""}
                      onChange={(e) => setIntakeAnswers((a) => ({ ...a, [q.id]: e.target.value }))}
                      className="mt-1 w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                    />
                  )}
                </div>
              ))}
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setActiveIntake(null)}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-sm"
                >
                  {t("nurse.cancel")}
                </button>
                <button
                  type="button"
                  onClick={submitIntake}
                  disabled={saving}
                  className="rounded-xl bg-rose-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
                >
                  {saving ? t("nurse.saving") : t("nurse.intake.submit")}
                </button>
              </div>
            </div>
          ) : pending.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-8">{t("nurse.intake.noPending")}</p>
          ) : (
            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
              {pending.map((f) => (
                <li key={f.id} className="px-4 py-3 flex justify-between items-center">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{f.professionalName}</p>
                    <p className="text-xs text-slate-500">{new Date(f.sentAt).toLocaleDateString()}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openIntake(f.id)}
                    className="text-sm text-rose-600 font-medium hover:underline"
                  >
                    {t("nurse.intake.fill")}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "monitoring" && (
        <div className="space-y-4">
          <form onSubmit={submitMonitoring} className="rounded-2xl border border-rose-200 bg-rose-50/40 p-5 space-y-3">
            <h3 className="font-semibold text-slate-900">{t("nurse.monitoring.logTitle")}</h3>
            <textarea
              value={symptoms}
              onChange={(e) => setSymptoms(e.target.value)}
              rows={3}
              placeholder={t("nurse.monitoring.symptomsPlaceholder")}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
              required
            />
            <div>
              <label className="text-sm text-slate-600">{t("nurse.monitoring.severity")}: {severity}</label>
              <input type="range" min={0} max={10} value={severity} onChange={(e) => setSeverity(Number(e.target.value))} className="w-full" />
            </div>
            <button
              type="submit"
              disabled={saving}
              className="rounded-xl bg-rose-600 text-white px-4 py-2 text-sm font-medium disabled:opacity-50"
            >
              {saving ? t("nurse.saving") : t("nurse.monitoring.submit")}
            </button>
          </form>
          {entries.length > 0 && (
            <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white">
              {entries.map((e) => (
                <li key={e.id} className="px-4 py-3">
                  <p className="text-xs text-slate-500">{new Date(e.recordedAt).toLocaleString()}</p>
                  <p className="text-sm text-slate-800">{e.symptoms}</p>
                  {e.severity != null && (
                    <p className="text-xs text-slate-500">{t("nurse.monitoring.severity")}: {e.severity}/10</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {tab === "education" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <BookOpen size={32} className="mx-auto text-rose-300 mb-3" />
          <p className="text-slate-600">{t("nurse.patient.educationPlaceholder")}</p>
        </div>
      )}
    </div>
  );
}
