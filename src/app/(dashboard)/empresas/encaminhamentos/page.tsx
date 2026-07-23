"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Loader2 } from "lucide-react";

type Referral = {
  id: string;
  source: string;
  target: string;
  status: string;
  reason: string;
  createdAt: string;
  workforceMember?: {
    firstName: string;
    lastName: string;
    email: string;
  } | null;
};

const TARGET_LABEL: Record<string, string> = {
  EAP: "EAP / Psicólogo",
  AET: "AET aprofundada",
  ERGONOMIST: "Ergonomista",
  PHYSICIAN: "Médico do trabalho",
};

const STATUS_LABEL: Record<string, string> = {
  OPEN: "Aberto",
  IN_PROGRESS: "Em andamento",
  CLOSED: "Fechado",
  DISMISSED: "Dispensado",
};

export default function EncaminhamentosPage() {
  const [loading, setLoading] = useState(true);
  const [referrals, setReferrals] = useState<Referral[]>([]);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employer/referrals");
    const data = await res.json();
    if (res.ok) setReferrals(data.referrals ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function setStatus(id: string, status: string) {
    await fetch("/api/employer/referrals", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    load();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Encaminhamentos</h1>
        <p className="text-slate-500 text-sm mt-1">
          Passo 6 — gatilhos automáticos de triagem PCMSO, CID F, dor/ergonomia e flags de AET.
        </p>
        <div className="mt-2 flex gap-3 text-sm">
          <Link href="/empresas/eap" className="text-sky-700 hover:underline">EAP →</Link>
          <Link href="/empresas/aep" className="text-sky-700 hover:underline">AEP/AET →</Link>
        </div>
      </div>

      {loading ? (
        <Loader2 className="animate-spin text-slate-400" />
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white divide-y divide-slate-100">
          {referrals.map((r) => (
            <div key={r.id} className="p-4 space-y-2">
              <div className="flex flex-wrap justify-between gap-2">
                <div>
                  <p className="font-medium text-slate-800">
                    {TARGET_LABEL[r.target] ?? r.target}
                    <span className="ml-2 text-xs font-normal text-slate-400">via {r.source}</span>
                  </p>
                  <p className="text-sm text-slate-600">
                    {r.workforceMember
                      ? `${r.workforceMember.firstName} ${r.workforceMember.lastName}`
                      : "Empresa (sem colaborador)"}
                  </p>
                </div>
                <span className="text-xs px-2 py-1 rounded-full bg-slate-100 text-slate-600 h-fit">
                  {STATUS_LABEL[r.status] ?? r.status}
                </span>
              </div>
              <p className="text-sm text-slate-600">{r.reason}</p>
              <div className="flex flex-wrap gap-2">
                {r.status === "OPEN" && (
                  <button
                    type="button"
                    onClick={() => setStatus(r.id, "IN_PROGRESS")}
                    className="text-xs px-2 py-1 rounded border border-slate-200"
                  >
                    Em andamento
                  </button>
                )}
                {(r.status === "OPEN" || r.status === "IN_PROGRESS") && (
                  <>
                    <button
                      type="button"
                      onClick={() => setStatus(r.id, "CLOSED")}
                      className="text-xs px-2 py-1 rounded bg-emerald-600 text-white"
                    >
                      Concluir
                    </button>
                    <button
                      type="button"
                      onClick={() => setStatus(r.id, "DISMISSED")}
                      className="text-xs px-2 py-1 rounded border border-slate-200 text-slate-500"
                    >
                      Dispensar
                    </button>
                  </>
                )}
              </div>
            </div>
          ))}
          {referrals.length === 0 && (
            <p className="p-6 text-sm text-slate-400 text-center">
              Nenhum encaminhamento ainda. Surgem automaticamente da triagem PCMSO, atestados CID F e flags de AET.
            </p>
          )}
        </div>
      )}
    </div>
  );
}
