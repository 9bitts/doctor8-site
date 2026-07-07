"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Copy, ExternalLink } from "lucide-react";

type Campaign = {
  id: string;
  title: string;
  instrument: string;
  status: string;
  publicToken: string;
  _count: { responses: number };
};

export default function PesquisasPage() {
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [title, setTitle] = useState("Pesquisa psicossocial — COPSOQ-lite");

  async function load() {
    setLoading(true);
    const res = await fetch("/api/employer/surveys");
    const data = await res.json();
    setCampaigns(data.campaigns ?? []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function createCampaign(e: React.FormEvent) {
    e.preventDefault();
    await fetch("/api/employer/surveys", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title, instrument: "COPSOQ-LITE" }),
    });
    load();
  }

  async function activate(id: string) {
    await fetch("/api/employer/surveys", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status: "ACTIVE", startsAt: new Date().toISOString() }),
    });
    load();
  }

  function surveyUrl(token: string) {
    if (typeof window === "undefined") return `/empresas/pesquisa/${token}`;
    return `${window.location.origin}/empresas/pesquisa/${token}`;
  }

  async function copyLink(token: string) {
    await navigator.clipboard.writeText(surveyUrl(token));
    alert("Link copiado!");
  }

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-8">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Pesquisas organizacionais</h1>
        <p className="text-slate-500 text-sm mt-1">
          Instrumentos validados com anonimato — avaliam condições de trabalho, não saúde mental individual.
        </p>
      </div>

      <form onSubmit={createCampaign} className="rounded-2xl border border-slate-200 bg-white p-6 flex gap-3">
        <input
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm"
        />
        <button type="submit" className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-sky-600 text-white text-sm font-medium">
          <Plus size={16} /> Criar
        </button>
      </form>

      {loading ? (
        <Loader2 className="animate-spin text-slate-400" />
      ) : (
        <ul className="space-y-3">
          {campaigns.map((c) => (
            <li key={c.id} className="rounded-xl border border-slate-200 p-4 bg-white">
              <div className="flex justify-between gap-4">
                <div>
                  <p className="font-medium text-slate-900">{c.title}</p>
                  <p className="text-xs text-slate-500 mt-1">
                    {c.instrument} · {c.status} · {c._count.responses} respostas
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  {c.status === "DRAFT" && (
                    <button type="button" onClick={() => activate(c.id)} className="text-sm text-sky-600 hover:underline">
                      Ativar
                    </button>
                  )}
                  {c.status === "ACTIVE" && (
                    <>
                      <button type="button" onClick={() => copyLink(c.publicToken)} className="text-slate-500 hover:text-sky-600">
                        <Copy size={18} />
                      </button>
                      <a href={surveyUrl(c.publicToken)} target="_blank" rel="noreferrer" className="text-slate-500 hover:text-sky-600">
                        <ExternalLink size={18} />
                      </a>
                    </>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
