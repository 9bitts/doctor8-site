"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

type Sector = {
  id: string;
  name: string;
  description: string | null;
  _count?: { jobFunctions: number; workforce: number; gheGroups: number };
};

type JobFunction = {
  id: string;
  name: string;
  sectorId: string | null;
  weeklyHours: number | null;
  sector?: { id: string; name: string } | null;
  _count?: { workforce: number; gheGroups: number };
};

type GheGroup = {
  id: string;
  name: string;
  sector: string | null;
  functions: string | null;
  sectorId: string | null;
  jobFunctionId: string | null;
  workerCount: number | null;
  sectorRef?: { id: string; name: string } | null;
  jobFunction?: { id: string; name: string } | null;
  _count?: { workforce: number; riskEntries: number };
};

export default function EstruturaPage() {
  const [loading, setLoading] = useState(true);
  const [sectors, setSectors] = useState<Sector[]>([]);
  const [functions, setFunctions] = useState<JobFunction[]>([]);
  const [gheGroups, setGheGroups] = useState<GheGroup[]>([]);

  const [sectorName, setSectorName] = useState("");
  const [fnName, setFnName] = useState("");
  const [fnSectorId, setFnSectorId] = useState("");
  const [fnHours, setFnHours] = useState("44");
  const [gheName, setGheName] = useState("");
  const [gheSectorId, setGheSectorId] = useState("");
  const [gheFnId, setGheFnId] = useState("");

  async function load() {
    setLoading(true);
    const [sRes, fRes, gRes] = await Promise.all([
      fetch("/api/employer/sectors"),
      fetch("/api/employer/functions"),
      fetch("/api/employer/ghe"),
    ]);
    const sData = await sRes.json();
    const fData = await fRes.json();
    const gData = await gRes.json();
    if (sRes.ok) setSectors(sData.sectors ?? []);
    if (fRes.ok) setFunctions(fData.functions ?? []);
    if (gRes.ok) setGheGroups(gData.groups ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, []);

  async function addSector(e: React.FormEvent) {
    e.preventDefault();
    if (!sectorName.trim()) return;
    await fetch("/api/employer/sectors", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: sectorName.trim() }),
    });
    setSectorName("");
    load();
  }

  async function addFunction(e: React.FormEvent) {
    e.preventDefault();
    if (!fnName.trim()) return;
    await fetch("/api/employer/functions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: fnName.trim(),
        sectorId: fnSectorId || null,
        weeklyHours: fnHours ? Number(fnHours) : null,
      }),
    });
    setFnName("");
    load();
  }

  async function addGhe(e: React.FormEvent) {
    e.preventDefault();
    if (!gheName.trim()) return;
    await fetch("/api/employer/ghe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name: gheName.trim(),
        sectorId: gheSectorId || null,
        jobFunctionId: gheFnId || null,
      }),
    });
    setGheName("");
    load();
  }

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="animate-spin text-slate-400" />
      </div>
    );
  }

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Estrutura SESMT</h1>
        <p className="text-slate-500 text-sm mt-1">
          Passo 1 — setores, funções e GHE (grupos homogêneos de exposição). Base para o inventário de riscos e o PCMSO.
        </p>
      </div>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Setores</h2>
        <form onSubmit={addSector} className="flex gap-2">
          <input
            value={sectorName}
            onChange={(e) => setSectorName(e.target.value)}
            placeholder="Ex.: Manutenção"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <button type="submit" className="inline-flex items-center gap-1 px-3 py-2 rounded-lg bg-sky-600 text-white text-sm">
            <Plus size={14} /> Adicionar
          </button>
        </form>
        <ul className="divide-y divide-slate-100">
          {sectors.map((s) => (
            <li key={s.id} className="py-2 flex justify-between text-sm">
              <span className="font-medium text-slate-800">{s.name}</span>
              <span className="text-slate-400 flex items-center gap-3">
                {s._count?.jobFunctions ?? 0} funções
                <button
                  type="button"
                  onClick={async () => {
                    await fetch(`/api/employer/sectors?id=${s.id}`, { method: "DELETE" });
                    load();
                  }}
                  className="text-red-500"
                >
                  <Trash2 size={14} />
                </button>
              </span>
            </li>
          ))}
          {sectors.length === 0 && <li className="text-slate-400 text-sm py-2">Nenhum setor cadastrado.</li>}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">Funções</h2>
        <form onSubmit={addFunction} className="grid sm:grid-cols-4 gap-2">
          <input
            value={fnName}
            onChange={(e) => setFnName(e.target.value)}
            placeholder="Ex.: Oficial de Montagem II"
            className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={fnSectorId}
            onChange={(e) => setFnSectorId(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Setor (opcional)</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <input
              value={fnHours}
              onChange={(e) => setFnHours(e.target.value)}
              type="number"
              min={1}
              max={60}
              title="Jornada semanal"
              className="w-20 rounded-lg border border-slate-200 px-2 py-2 text-sm"
            />
            <button type="submit" className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2 rounded-lg bg-sky-600 text-white text-sm">
              <Plus size={14} />
            </button>
          </div>
        </form>
        <ul className="divide-y divide-slate-100">
          {functions.map((f) => (
            <li key={f.id} className="py-2 flex justify-between text-sm">
              <span>
                <span className="font-medium text-slate-800">{f.name}</span>
                {f.sector && <span className="text-slate-400 ml-2">· {f.sector.name}</span>}
                {f.weeklyHours != null && <span className="text-slate-400 ml-2">· {f.weeklyHours}h/sem</span>}
              </span>
              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/employer/functions?id=${f.id}`, { method: "DELETE" });
                  load();
                }}
                className="text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
          {functions.length === 0 && <li className="text-slate-400 text-sm py-2">Nenhuma função cadastrada.</li>}
        </ul>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <h2 className="font-semibold text-slate-800">GHE — Grupos homogêneos de exposição</h2>
        <form onSubmit={addGhe} className="grid sm:grid-cols-4 gap-2">
          <input
            value={gheName}
            onChange={(e) => setGheName(e.target.value)}
            placeholder="Ex.: GHE Manutenção — Montagem"
            className="sm:col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
          <select
            value={gheSectorId}
            onChange={(e) => setGheSectorId(e.target.value)}
            className="rounded-lg border border-slate-200 px-3 py-2 text-sm"
          >
            <option value="">Setor</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>{s.name}</option>
            ))}
          </select>
          <div className="flex gap-2">
            <select
              value={gheFnId}
              onChange={(e) => setGheFnId(e.target.value)}
              className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="">Função</option>
              {functions.map((f) => (
                <option key={f.id} value={f.id}>{f.name}</option>
              ))}
            </select>
            <button type="submit" className="inline-flex items-center justify-center px-3 py-2 rounded-lg bg-sky-600 text-white text-sm">
              <Plus size={14} />
            </button>
          </div>
        </form>
        <ul className="divide-y divide-slate-100">
          {gheGroups.map((g) => (
            <li key={g.id} className="py-2 flex justify-between text-sm">
              <span>
                <span className="font-medium text-slate-800">{g.name}</span>
                <span className="text-slate-400 ml-2">
                  {[g.sectorRef?.name || g.sector, g.jobFunction?.name || g.functions].filter(Boolean).join(" · ")}
                </span>
                <span className="text-slate-400 ml-2">
                  · {g._count?.riskEntries ?? 0} riscos · {g._count?.workforce ?? 0} colab.
                </span>
              </span>
              <button
                type="button"
                onClick={async () => {
                  await fetch(`/api/employer/ghe?id=${g.id}`, { method: "DELETE" });
                  load();
                }}
                className="text-red-500"
              >
                <Trash2 size={14} />
              </button>
            </li>
          ))}
          {gheGroups.length === 0 && <li className="text-slate-400 text-sm py-2">Nenhum GHE cadastrado.</li>}
        </ul>
      </section>
    </div>
  );
}
