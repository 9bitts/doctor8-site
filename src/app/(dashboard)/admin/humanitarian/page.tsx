"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Heart, Loader2, RefreshCw, Radio, Users, CheckCircle2, AlertTriangle, Power, Download,
} from "lucide-react";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";
import HumanitarianIntakesPanel from "@/components/humanitarian/HumanitarianIntakesPanel";

interface CampaignReport {
  campaignId: string;
  slug: string;
  name: string;
  active: boolean;
  totals: {
    waiting: number;
    inConsult: number;
    completedToday: number;
    noShowsToday: number;
    volunteersOnline: number;
    volunteersBusy: number;
    avgWaitMinutesToday: number | null;
  };
  pools: {
    slug: string;
    labelEs: string;
    maxWaiting: number;
    waiting: number;
    volunteersOnline: number;
    volunteersBusy: number;
    completedToday: number;
    crisisWaiting: number;
  }[];
}

export default function AdminHumanitarianPage() {
  const [reports, setReports] = useState<CampaignReport[]>([]);
  const [loading, setLoading] = useState(true);
  const [seeding, setSeeding] = useState(false);
  const [toggling, setToggling] = useState(false);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/admin/humanitarian");
      const data = await res.json();
      if (res.ok) setReports(data.campaigns || []);
    } catch { /* ignore */ }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

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

  async function toggleActive(slug: string, active: boolean) {
    setToggling(true);
    try {
      await fetch("/api/admin/humanitarian", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug, active }),
      });
      await load();
    } catch { /* ignore */ }
    setToggling(false);
  }

  async function exportCsv(slug: string, type: "queue" | "intakes" = "queue") {
    setExporting(true);
    try {
      const res = await fetch(
        `/api/admin/humanitarian/export?slug=${encodeURIComponent(slug)}&type=${type}`,
      );
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `humanitarian-${type}-${slug}-${new Date().toISOString().slice(0, 10)}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch { /* ignore */ }
    setExporting(false);
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-10">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <Heart size={22} className="text-rose-500" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Atenci?n humanitaria</h1>
            <p className="text-sm text-slate-500">Monitor en tiempo real ? Venezuela</p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
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
            {seeding ? <Loader2 size={14} className="animate-spin" /> : <Power size={14} />}
            Ativar Venezuela
          </button>
        </div>
      </div>

      <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 text-sm text-rose-900 space-y-2">
        <p className="font-medium">Enlaces de campa?a</p>
        <p className="text-rose-800">
          Landing p?blica: <code className="bg-white/80 px-1 rounded">/sos-venezuela</code>
        </p>
        <p className="text-rose-800">
          Pacientes: <code className="bg-white/80 px-1 rounded">/humanitarian/{VENEZUELA_CAMPAIGN_SLUG}</code>
          {" ? "}
          Voluntarios: <code className="bg-white/80 px-1 rounded">/humanitarian/volunteer</code>
        </p>
      </div>

      {loading && reports.length === 0 ? (
        <Loader2 size={24} className="animate-spin text-emerald-500" />
      ) : reports.length === 0 ? (
        <p className="text-slate-500 text-sm">Nenhuma campanha. Clique em &quot;Ativar Venezuela&quot;.</p>
      ) : (
        reports.map((c) => (
          <div key={c.campaignId} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm space-y-5">
            <div className="flex items-start justify-between gap-4 flex-wrap">
              <div>
                <h2 className="font-bold text-slate-900 text-lg">{c.name}</h2>
                <p className="text-xs text-slate-500">{c.slug}</p>
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => exportCsv(c.slug, "queue")}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  CSV fila hoy
                </button>
                <button
                  type="button"
                  disabled={exporting}
                  onClick={() => exportCsv(c.slug, "intakes")}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50 flex items-center gap-1.5"
                >
                  {exporting ? <Loader2 size={12} className="animate-spin" /> : <Download size={12} />}
                  CSV fichas
                </button>
                <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${c.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"}`}>
                  {c.active ? "Activa" : "Pausada"}
                </span>
                <button
                  type="button"
                  disabled={toggling}
                  onClick={() => toggleActive(c.slug, !c.active)}
                  className="text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-50"
                >
                  {c.active ? "Pausar" : "Activar"}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: "En fila", value: c.totals.waiting, icon: Radio, color: "text-amber-600" },
                { label: "En consulta", value: c.totals.inConsult, icon: Users, color: "text-blue-600" },
                { label: "Atendidos hoy", value: c.totals.completedToday, icon: CheckCircle2, color: "text-emerald-600" },
                { label: "Voluntarios", value: `${c.totals.volunteersOnline}/${c.totals.volunteersBusy}`, icon: Heart, color: "text-rose-600" },
              ].map((stat) => (
                <div key={stat.label} className="bg-slate-50 rounded-xl p-3">
                  <p className="text-xs text-slate-500">{stat.label}</p>
                  <p className={`text-xl font-bold ${stat.color}`}>{stat.value}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-slate-500">
              <span>No-show hoy: {c.totals.noShowsToday}</span>
              {c.totals.avgWaitMinutesToday != null && (
                <span>Espera media hoy: ~{c.totals.avgWaitMinutesToday} min</span>
              )}
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-xs text-slate-500 border-b">
                    <th className="pb-2 pr-4">Fila</th>
                    <th className="pb-2 pr-4">Esperando</th>
                    <th className="pb-2 pr-4">Crisis</th>
                    <th className="pb-2 pr-4">Cap.</th>
                    <th className="pb-2 pr-4">Hoy</th>
                    <th className="pb-2">Voluntarios</th>
                  </tr>
                </thead>
                <tbody>
                  {c.pools.map((p) => (
                    <tr key={p.slug} className="border-b border-slate-50">
                      <td className="py-2.5 pr-4 font-medium">{p.labelEs}</td>
                      <td className="py-2.5 pr-4">{p.waiting}</td>
                      <td className="py-2.5 pr-4">
                        {p.crisisWaiting > 0 ? (
                          <span className="text-rose-600 font-semibold flex items-center gap-1">
                            <AlertTriangle size={12} /> {p.crisisWaiting}
                          </span>
                        ) : (
                          "0"
                        )}
                      </td>
                      <td className="py-2.5 pr-4">{p.maxWaiting}</td>
                      <td className="py-2.5 pr-4">{p.completedToday}</td>
                      <td className="py-2.5">{p.volunteersOnline} libres ? {p.volunteersBusy} ocupados</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ))
      )}

      <HumanitarianIntakesPanel slug={VENEZUELA_CAMPAIGN_SLUG} />
    </div>
  );
}
