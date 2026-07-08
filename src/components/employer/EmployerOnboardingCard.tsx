"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2, X, CheckCircle2, Circle } from "lucide-react";

type Step = { id: string; label: string; href: string; done: boolean };

export default function EmployerOnboardingCard() {
  const [loading, setLoading] = useState(true);
  const [steps, setSteps] = useState<Step[]>([]);
  const [percent, setPercent] = useState(0);
  const [dismissed, setDismissed] = useState(false);
  const [alerts, setAlerts] = useState<{ highRiskCount: number; openWhistleblower: number; pcmsoIncomplete: boolean } | null>(null);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employer/onboarding");
    const data = await res.json();
    if (res.ok) {
      setSteps(data.steps ?? []);
      setPercent(data.completionPercent ?? 0);
      setDismissed(data.dismissed);
      setAlerts(data.alerts ?? null);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function dismiss() {
    await fetch("/api/employer/onboarding", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dismissed: true }),
    });
    setDismissed(true);
  }

  if (loading) return null;
  if (dismissed || percent >= 100) return null;

  return (
    <div className="rounded-2xl border border-sky-200 bg-gradient-to-br from-sky-50 to-white p-6 space-y-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-semibold text-slate-900">Onboarding NR-1 · {percent}% concluído</h2>
          <p className="text-sm text-slate-500 mt-1">Siga os passos para conformidade Portaria MTE 1.419/2024</p>
        </div>
        <button type="button" onClick={dismiss} className="text-slate-400 hover:text-slate-600" aria-label="Ocultar">
          <X size={18} />
        </button>
      </div>

      {alerts && (alerts.highRiskCount > 0 || alerts.openWhistleblower > 0) && (
        <div className="text-sm text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
          {alerts.highRiskCount > 0 && <span>{alerts.highRiskCount} risco(s) alto/crítico. </span>}
          {alerts.openWhistleblower > 0 && <span>{alerts.openWhistleblower} denúncia(s) aberta(s). </span>}
          {alerts.pcmsoIncomplete && <span>PCMSO incompleto.</span>}
        </div>
      )}

      <ul className="space-y-2">
        {steps.map((s) => (
          <li key={s.id}>
            <Link
              href={s.href}
              className="flex items-center gap-2 text-sm text-slate-700 hover:text-sky-700"
            >
              {s.done ? <CheckCircle2 size={16} className="text-emerald-600 shrink-0" /> : <Circle size={16} className="text-slate-300 shrink-0" />}
              {s.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
