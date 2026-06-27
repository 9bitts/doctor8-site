"use client";

import { useState, useEffect } from "react";
import { Loader2, Plus, Megaphone } from "lucide-react";

export default function OrganizationMarketingPage() {
  const [loading, setLoading] = useState(true);
  const [nps, setNps] = useState(0);
  const [average, setAverage] = useState(0);
  const [total, setTotal] = useState(0);
  const [distribution, setDistribution] = useState({ promoters: 0, passives: 0, detractors: 0 });
  const [responses, setResponses] = useState<{ id: string; patientName: string | null; score: number; comment: string | null; createdAt: string }[]>([]);
  const [form, setForm] = useState({ patientName: "", score: "10", comment: "" });

  async function load() {
    setLoading(true);
    const res = await fetch("/api/organization/surveys");
    const data = await res.json();
    if (res.ok) {
      setNps(data.nps);
      setAverage(data.average);
      setTotal(data.total);
      setDistribution(data.distribution);
      setResponses(data.responses || []);
    }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/organization/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patientName: form.patientName || undefined,
        score: parseInt(form.score, 10),
        comment: form.comment || undefined,
      }),
    });
    setForm({ patientName: "", score: "10", comment: "" });
    await load();
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Megaphone className="text-indigo-600" size={24} />
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 break-words">Marketing e NPS</h1>
          <p className="text-slate-500 text-sm">Satisfacao dos pacientes da clinica</p>
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 className="animate-spin text-indigo-500" size={32} /></div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
            <div className="bg-white rounded-2xl border p-5 text-center">
              <p className={`text-3xl font-bold ${nps >= 50 ? "text-emerald-600" : nps >= 0 ? "text-amber-600" : "text-red-600"}`}>{nps}</p>
              <p className="text-sm text-slate-500 mt-1">NPS</p>
            </div>
            <div className="bg-white rounded-2xl border p-5 text-center">
              <p className="text-3xl font-bold text-slate-900">{average}</p>
              <p className="text-sm text-slate-500 mt-1">Media (0-10)</p>
            </div>
            <div className="bg-white rounded-2xl border p-5 text-center">
              <p className="text-3xl font-bold text-slate-900">{total}</p>
              <p className="text-sm text-slate-500 mt-1">Respostas</p>
            </div>
          </div>

          <div className="bg-white rounded-2xl border p-5 flex flex-wrap justify-around gap-4 text-center text-sm">
            <div><p className="font-bold text-emerald-600">{distribution.promoters}</p><p className="text-slate-500">Promotores</p></div>
            <div><p className="font-bold text-amber-600">{distribution.passives}</p><p className="text-slate-500">Neutros</p></div>
            <div><p className="font-bold text-red-600">{distribution.detractors}</p><p className="text-slate-500">Detratores</p></div>
          </div>

          <form onSubmit={submit} className="bg-white rounded-2xl border p-5 space-y-3">
            <p className="text-sm font-medium text-slate-700">Registrar avaliacao manual</p>
            <div className="grid sm:grid-cols-3 gap-3">
              <input placeholder="Paciente" value={form.patientName} onChange={(e) => setForm({ ...form, patientName: e.target.value })} className="border rounded-xl px-3 py-2 text-sm" />
              <input type="number" min={0} max={10} value={form.score} onChange={(e) => setForm({ ...form, score: e.target.value })} className="border rounded-xl px-3 py-2 text-sm" />
              <input placeholder="Comentario" value={form.comment} onChange={(e) => setForm({ ...form, comment: e.target.value })} className="border rounded-xl px-3 py-2 text-sm" />
            </div>
            <button type="submit" className="bg-indigo-600 text-white px-4 py-2 rounded-xl text-sm font-medium flex items-center gap-1">
              <Plus size={16} /> Registrar
            </button>
          </form>

          <div className="bg-white rounded-2xl border divide-y max-h-80 overflow-y-auto">
            {responses.map((r) => (
              <div key={r.id} className="px-5 py-3 text-sm">
                <div className="flex justify-between">
                  <span className="font-medium">{r.patientName || "Paciente"}</span>
                  <span className="font-bold text-indigo-600">{r.score}/10</span>
                </div>
                {r.comment && <p className="text-slate-500 text-xs mt-1">{r.comment}</p>}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
