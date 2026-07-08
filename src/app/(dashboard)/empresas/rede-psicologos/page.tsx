"use client";

import { useEffect, useState, useCallback } from "react";
import { Loader2, Plus, Brain, Search, Power } from "lucide-react";

type Psych = {
  id: string;
  professionalId: string;
  name: string;
  specialty: string;
  licenseNumber: string;
  repassePercent: number;
  status: string;
};

type SearchResult = {
  id: string;
  name: string;
  licenseNumber: string;
  location: string | null;
};

export default function RedePsicologosPage() {
  const [list, setList] = useState<Psych[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [repasse, setRepasse] = useState(70);
  const [saving, setSaving] = useState(false);

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employer/psychologists");
    const data = await res.json();
    setList(data.psychologists ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const runSearch = useCallback(async (q: string) => {
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setSearching(true);
    const res = await fetch(`/api/employer/psychologists/search?q=${encodeURIComponent(q.trim())}`);
    const data = await res.json();
    setSearchResults(data.psychologists ?? []);
    setSearching(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => runSearch(query), 300);
    return () => clearTimeout(t);
  }, [query, runSearch]);

  async function handleAdd(e: React.FormEvent) {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    await fetch("/api/employer/psychologists", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ professionalId: selected.id, repassePercent: repasse }),
    });
    setSelected(null);
    setQuery("");
    setSearchResults([]);
    setSaving(false);
    load();
  }

  async function toggleStatus(p: Psych) {
    await fetch("/api/employer/psychologists", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: p.id,
        status: p.status === "ACTIVE" ? "INACTIVE" : "ACTIVE",
      }),
    });
    load();
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Rede EAP — Psicólogos</h1>
        <p className="text-slate-500 text-sm mt-1">
          Busque psicólogos verificados no Doctor8. Colaboradores só agendam com a rede (se houver credenciados ativos).
        </p>
      </div>

      <form onSubmit={handleAdd} className="rounded-2xl border border-slate-200 bg-white p-6 space-y-4">
        <div className="relative">
          <Search className="absolute left-3 top-2.5 text-slate-400" size={16} />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setSelected(null); }}
            placeholder="Buscar por nome ou CRP…"
            className="w-full rounded-lg border border-slate-200 pl-9 pr-3 py-2 text-sm"
          />
        </div>
        {searching && <Loader2 className="animate-spin text-slate-400" size={18} />}
        {searchResults.length > 0 && !selected && (
          <ul className="border border-slate-100 rounded-lg divide-y max-h-48 overflow-y-auto">
            {searchResults.map((r) => (
              <li key={r.id}>
                <button
                  type="button"
                  onClick={() => { setSelected(r); setQuery(r.name); setSearchResults([]); }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-sky-50"
                >
                  <span className="font-medium text-slate-900">{r.name}</span>
                  <span className="text-slate-500 text-xs block">{r.licenseNumber}{r.location ? ` · ${r.location}` : ""}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
        {selected && (
          <p className="text-sm text-sky-800 bg-sky-50 rounded-lg px-3 py-2">
            Selecionado: <strong>{selected.name}</strong> ({selected.licenseNumber})
          </p>
        )}
        <div className="flex flex-col sm:flex-row gap-3">
          <label className="text-sm text-slate-600 flex items-center gap-2">
            Repasse %
            <input
              type="number"
              min={0}
              max={100}
              value={repasse}
              onChange={(e) => setRepasse(Number(e.target.value))}
              className="w-20 rounded-lg border border-slate-200 px-2 py-1"
            />
          </label>
          <button
            type="submit"
            disabled={!selected || saving}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium disabled:opacity-50"
          >
            <Plus size={16} /> Credenciar na rede
          </button>
        </div>
      </form>

      {loading ? (
        <Loader2 className="animate-spin text-slate-400" />
      ) : (
        <ul className="space-y-3">
          {list.map((p) => (
            <li key={p.id} className="rounded-xl border border-slate-200 p-4 bg-white flex items-center gap-3">
              <Brain className="text-sky-600 shrink-0" size={20} />
              <div className="flex-1 min-w-0">
                <p className="font-medium text-slate-900">{p.name}</p>
                <p className="text-xs text-slate-500 truncate">{p.licenseNumber} · repasse {p.repassePercent}%</p>
              </div>
              <span className={`text-xs px-2 py-0.5 rounded-full ${p.status === "ACTIVE" ? "bg-emerald-100 text-emerald-800" : "bg-slate-100 text-slate-600"}`}>
                {p.status === "ACTIVE" ? "Ativo" : "Inativo"}
              </span>
              <button
                type="button"
                onClick={() => toggleStatus(p)}
                className="text-slate-400 hover:text-slate-700 p-1"
                title={p.status === "ACTIVE" ? "Desativar" : "Ativar"}
              >
                <Power size={16} />
              </button>
            </li>
          ))}
          {list.length === 0 && (
            <p className="text-slate-400 text-sm">Nenhum psicólogo credenciado. Sem rede ativa, colaboradores podem agendar qualquer psicólogo verificado.</p>
          )}
        </ul>
      )}
    </div>
  );
}
