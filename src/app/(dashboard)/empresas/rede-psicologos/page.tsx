"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Brain } from "lucide-react";

type Psych = {
  id: string;
  professionalId: string;
  name: string;
  specialty: string;
  licenseNumber: string;
  repassePercent: number;
  status: string;
};

export default function RedePsicologosPage() {
  const [list, setList] = useState<Psych[]>([]);
  const [loading, setLoading] = useState(true);
  const [professionalId, setProfessionalId] = useState("");
  const [repasse, setRepasse] = useState(70);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employer/psychologists");
    const data = await res.json();
    setList(data.psychologists ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/employer/psychologists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ professionalId: professionalId.trim(), repassePercent: repasse }),
    });
    setProfessionalId("");
    load();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rede EAP — Psicólogos</h1>
        <p className="text-slate-500 text-sm mt-1">
          Credencie psicólogos para atendimento corporativo. Colaboradores só agendam com a rede (se configurada).
        </p>
      </div>

      <form onSubmit={handleAdd} className="rounded-2xl border border-slate-200 bg-white p-6 flex flex-col sm:flex-row gap-3">
        <input
          required
          value={professionalId}
          onChange={(e) => setProfessionalId(e.target.value)}
          placeholder="ID do perfil profissional (ProfessionalProfile)"
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
        />
        <input
          type="number"
          min={0}
          max={100}
          value={repasse}
          onChange={(e) => setRepasse(Number(e.target.value))}
          className="w-24 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          title="Repasse %"
        />
        <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium">
          <Plus size={16} /> Credenciar
        </button>
      </form>

      {loading ? (
        <Loader2 className="animate-spin text-slate-400" />
      ) : (
        <ul className="space-y-3">
          {list.map((p) => (
            <li key={p.id} className="rounded-xl border border-slate-200 p-4 bg-white flex items-center gap-3">
              <Brain className="text-sky-600 shrink-0" size={20} />
              <div className="flex-1">
                <p className="font-medium text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-500">{p.specialty} · {p.licenseNumber} · repasse {p.repassePercent}%</p>
              </div>
              <span className="text-xs text-slate-500">{p.status}</span>
            </li>
          ))}
          {list.length === 0 && (
            <p className="text-slate-400 text-sm">Nenhum psicólogo credenciado. Sem rede, colaboradores podem agendar qualquer psicólogo verificado.</p>
          )}
        </ul>
      )}
    </div>
  );
}
