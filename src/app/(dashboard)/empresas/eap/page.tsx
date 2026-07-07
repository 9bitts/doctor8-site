"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

export default function EapPage() {
  const [loading, setLoading] = useState(true);
  const [enabled, setEnabled] = useState(true);
  const [sessionsPerEmployee, setSessionsPerEmployee] = useState(6);
  const [jitEnabled, setJitEnabled] = useState(false);
  const [utilization, setUtilization] = useState({ activeMembers: 0, totalSessionsUsed: 0 });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employer/eap");
    const data = await res.json();
    if (data.benefit) {
      setEnabled(data.benefit.enabled);
      setSessionsPerEmployee(data.benefit.sessionsPerEmployee);
      setJitEnabled(data.benefit.jitEnabled);
    }
    setUtilization(data.utilization ?? { activeMembers: 0, totalSessionsUsed: 0 });
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function save() {
    await fetch("/api/employer/eap", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ enabled, sessionsPerEmployee, jitEnabled }),
    });
    load();
  }

  if (loading) return <div className="p-6"><Loader2 className="animate-spin text-slate-400" /></div>;

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">EAP — Atendimento psicológico</h1>
        <p className="text-slate-500 text-sm mt-1">
          Medida complementar ao PGR. Sessões sigilosas com psicólogos credenciados Doctor8 (CFP + TDIC).
        </p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={enabled} onChange={(e) => setEnabled(e.target.checked)} />
          Programa EAP ativo
        </label>
        <label className="block text-sm text-slate-600">
          Sessões por colaborador / ano
          <input
            type="number"
            min={0}
            max={52}
            value={sessionsPerEmployee}
            onChange={(e) => setSessionsPerEmployee(+e.target.value)}
            className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={jitEnabled} onChange={(e) => setJitEnabled(e.target.checked)} />
          Fila JIT corporativa (urgências)
        </label>
        <button type="button" onClick={save} className="px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium">
          Salvar configuração
        </button>
      </div>

      <div className="rounded-xl border border-slate-200 p-5 bg-slate-50">
        <h2 className="font-semibold text-slate-800 text-sm">Utilização agregada (sem conteúdo clínico)</h2>
        <p className="text-2xl font-bold text-sky-700 mt-2">{utilization.totalSessionsUsed} sessões</p>
        <p className="text-xs text-slate-500">{utilization.activeMembers} colaboradores ativos no EAP</p>
      </div>

      <p className="text-sm text-slate-600">
        Psicólogos atendem via{" "}
        <Link href="/psicologos" className="text-sky-600 underline">portal Doctor8 Psicologia</Link>
        . Credenciamento corporativo e repasse B2B em evolução.
      </p>
    </div>
  );
}
