"use client";

import { useEffect, useState } from "react";
import { Heart, Loader2, RefreshCw, Radio } from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

interface CampaignRow {
  id: string;
  slug: string;
  name: string;
  active: boolean;
  waitingTotal: number;
  volunteerCount: number;
  pools: {
    slug: string;
    labelEs: string;
    maxWaiting: number;
    waiting: number;
    volunteersOnline: number;
    volunteersBusy: number;
  }[];
}

export default function AdminHumanitarianPage() {
  const [campaigns, setCampaigns] = useState<CampaignRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);

  async function load() {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/humanitarian");
      const data = await res.json();
      if (res.ok) setCampaigns(data.campaigns || []);
    } catch { /* ignore */ }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function seedVenezuela() {
    setSeeding(true);
    try {
      await fetch("/api/admin/humanitarian", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "seed-venezuela" }),
      });
      await load();
    } catch { /* ignore */ }
    setSeeding(false);
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Heart size={22} className="text-rose-500" />
          <h1 className="text-2xl font-bold text-slate-900">Atenci?n humanitaria</h1>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={load}
            className="px-4 py-2 rounded-xl border border-slate-200 text-sm font-medium flex items-center gap-2"
          >
            <RefreshCw size={14} /> Atualizar
          </button>
          <button
            type="button"
            onClick={seedVenezuela}
            disabled={seeding}
            className="px-4 py-2 rounded-xl bg-emerald-500 text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50"
          >
            {seeding ? <Loader2 size={14} className="animate-spin" /> : null}
            Ativar Venezuela
          </button>
        </div>
      </div>

      <p className="text-sm text-slate-600">
        Campanha Venezuela: filas centralizadas (m?dico 500, psic?logo 200, psicanalista 100, terapeuta 100).
        Pacientes: <code className="text-xs bg-slate-100 px-1 rounded">/humanitarian/{VENEZUELA_CAMPAIGN_SLUG}</code>
      </p>

      {loading ? (
        <Loader2 size={24} className="animate-spin text-emerald-500" />
      ) : campaigns.length === 0 ? (
        <p className="text-slate-500 text-sm">Nenhuma campanha. Clique em &quot;Ativar Venezuela&quot;.</p>
      ) : (
        campaigns.map((c) => (
          <div key={c.id} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-bold text-slate-900">{c.name}</h2>
                <p className="text-xs text-slate-500">{c.slug}</p>
              </div>
              <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                {c.active ? "Ativa" : "Inativa"}
              </span>
            </div>
            <div className="flex gap-4 text-sm text-slate-600">
              <span className="flex items-center gap-1"><Radio size={14} /> {c.waitingTotal} na fila</span>
              <span>{c.volunteerCount} volunt?rios cadastrados</span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b">
                    <th className="pb-2 pr-4">Fila</th>
                    <th className="pb-2 pr-4">Esperando</th>
                    <th className="pb-2 pr-4">Cap.</th>
                    <th className="pb-2">Volunt?rios</th>
                  </tr>
                </thead>
                <tbody>
                  {c.pools.map((p) => (
                    <tr key={p.slug} className="border-b border-slate-50">
                      <td className="py-2 pr-4 font-medium">{p.labelEs}</td>
                      <td className="py-2 pr-4">{p.waiting}</td>
                      <td className="py-2 pr-4">{p.maxWaiting}</td>
                      <td className="py-2">{p.volunteersOnline} livre ? {p.volunteersBusy} ocupado</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
