"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, CheckCircle2 } from "lucide-react";
import Link from "next/link";

type AepRecord = {
  id: string;
  title: string;
  version: number;
  status: string;
  methodology: string | null;
  methodologyRationale: string | null;
  workerParticipation: string | null;
  notes: string | null;
  approvedByName: string | null;
  _count: { riskEntries: number };
};

export default function AepPage() {
  const [records, setRecords] = useState<AepRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("AEP — Riscos psicossociais");
  const [methodologyRationale, setMethodologyRationale] = useState("");
  const [workerParticipation, setWorkerParticipation] = useState("");
  const [error, setError] = useState("");
  const [approvedByName, setApprovedByName] = useState("");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employer/nr1/aep");
    const data = await res.json();
    setRecords(data.records ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createDraft(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    await fetch("/api/employer/nr1/aep", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        title,
        methodology: "COPSOQ-LITE + entrevistas + observação",
        methodologyRationale,
        workerParticipation,
        status: "IN_PROGRESS",
      }),
    });
    load();
  }

  async function markCompleted(id: string) {
    setError("");
    const res = await fetch("/api/employer/nr1/aep", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "COMPLETED" }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Não foi possível concluir. Vincule riscos em NR-1 e preencha o racional.");
      return;
    }
    load();
  }

  async function markApproved(id: string) {
    if (!approvedByName.trim()) {
      setError("Informe o nome do responsável pela aprovação.");
      return;
    }
    const res = await fetch("/api/employer/nr1/aep", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "APPROVED", approvedByName: approvedByName.trim() }),
    });
    const data = await res.json();
    if (!res.ok) {
      setError(data.error || "Erro ao aprovar.");
      return;
    }
    load();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Avaliação Ergonômica Preliminar (AEP)</h1>
        <p className="text-slate-500 text-sm mt-1">
          Obrigatória para todas as empresas (NR-17 + NR-1). Vincule riscos em{" "}
          <Link href="/empresas/nr1" className="text-sky-600 hover:underline">Inventário NR-1</Link>.
        </p>
      </div>

      {error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{error}</p>
      )}

      <form onSubmit={createDraft} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold">Nova AEP</h2>
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <textarea
          value={methodologyRationale}
          onChange={(e) => setMethodologyRationale(e.target.value)}
          placeholder="Racional da metodologia escolhida (subitem 1.5.4.4.2.2 NR-1)"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[72px]"
        />
        <textarea
          value={workerParticipation}
          onChange={(e) => setWorkerParticipation(e.target.value)}
          placeholder="Participação dos trabalhadores / CIPA"
          className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[72px]"
        />
        <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium">
          <Plus size={16} /> Iniciar AEP
        </button>
      </form>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label className="text-xs text-slate-500">Aprovador (nome completo)</label>
        <input
          value={approvedByName}
          onChange={(e) => setApprovedByName(e.target.value)}
          placeholder="Responsável SST / ergonomista"
          className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-slate-400" />
      ) : (
        <ul className="space-y-3">
          {records.map((r) => (
            <li key={r.id} className="rounded-xl border border-slate-200 p-4 bg-white flex justify-between gap-4 items-start">
              <div>
                <p className="font-medium text-slate-900 flex items-center gap-2">
                  {r.title} · v{r.version}
                  {(r.status === "COMPLETED" || r.status === "APPROVED") && (
                    <CheckCircle2 size={16} className="text-emerald-600" />
                  )}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  Status: {r.status} · {r._count.riskEntries} riscos vinculados
                </p>
                {r.methodology && <p className="text-xs text-slate-600 mt-2">Método: {r.methodology}</p>}
                {r.approvedByName && <p className="text-xs text-slate-600">Aprovado por: {r.approvedByName}</p>}
              </div>
              <div className="flex flex-col gap-2 shrink-0">
                {r.status !== "COMPLETED" && r.status !== "APPROVED" && (
                  <button
                    type="button"
                    onClick={() => markCompleted(r.id)}
                    className="text-sm text-sky-600 hover:underline"
                  >
                    Concluir
                  </button>
                )}
                {r.status === "COMPLETED" && (
                  <button
                    type="button"
                    onClick={() => markApproved(r.id)}
                    className="text-sm text-emerald-600 hover:underline"
                  >
                    Aprovar
                  </button>
                )}
              </div>
            </li>
          ))}
          {records.length === 0 && (
            <p className="text-slate-400 text-sm">Nenhuma AEP registrada.</p>
          )}
        </ul>
      )}
    </div>
  );
}
