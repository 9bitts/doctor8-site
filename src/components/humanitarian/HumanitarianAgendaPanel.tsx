"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Download, Loader2, Search } from "lucide-react";
import type { AgendaItemDto } from "@/lib/humanitarian/admin-agenda";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function daysFromNow(n: number) {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function daysAgo(n: number) {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
}

export default function HumanitarianAgendaPanel({
  slug = VENEZUELA_CAMPAIGN_SLUG,
}: {
  slug?: string;
}) {
  const [from, setFrom] = useState(daysAgo(1));
  const [to, setTo] = useState(daysFromNow(7));
  const [kind, setKind] = useState<"all" | "queue" | "scheduled">("all");
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [items, setItems] = useState<AgendaItemDto[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        slug,
        from,
        to,
        kind,
        status,
      });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/humanitarian/agenda?${params}`);
      const data = await res.json();
      if (res.ok) setItems(data.items || []);
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [slug, from, to, kind, status, q]);

  useEffect(() => {
    load();
  }, [load]);

  async function exportCsv() {
    setExporting(true);
    try {
      const params = new URLSearchParams({
        slug,
        from,
        to,
        kind,
        status,
        format: "csv",
      });
      if (q.trim()) params.set("q", q.trim());
      const res = await fetch(`/api/admin/humanitarian/agenda?${params}`);
      if (!res.ok) return;
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `humanitarian-agenda-${slug}-${todayIso()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      /* ignore */
    }
    setExporting(false);
  }

  return (
    <div className="space-y-4">
      <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
        <div className="flex flex-wrap gap-3 items-end">
          <label className="text-xs text-slate-500 space-y-1">
            <span className="block">De</span>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-slate-500 space-y-1">
            <span className="block">Até</span>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
            />
          </label>
          <label className="text-xs text-slate-500 space-y-1">
            <span className="block">Tipo</span>
            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as typeof kind)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
            >
              <option value="all">Todos</option>
              <option value="queue">Fila JIT</option>
              <option value="scheduled">Agendados</option>
            </select>
          </label>
          <label className="text-xs text-slate-500 space-y-1">
            <span className="block">Status</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
            >
              <option value="all">Todos</option>
              <option value="WAITING">WAITING</option>
              <option value="CALLED">CALLED</option>
              <option value="IN_PROGRESS">IN_PROGRESS</option>
              <option value="DONE">DONE</option>
              <option value="NO_SHOW">NO_SHOW</option>
              <option value="CANCELLED">CANCELLED</option>
              <option value="CONFIRMED">CONFIRMED</option>
              <option value="PENDING">PENDING</option>
              <option value="COMPLETED">COMPLETED</option>
            </select>
          </label>
          <label className="text-xs text-slate-500 space-y-1 flex-1 min-w-[160px]">
            <span className="block">Buscar</span>
            <div className="relative">
              <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
              <input
                value={q}
                onChange={(e) => setQ(e.target.value)}
                placeholder="Paciente ou profissional"
                className="w-full border border-slate-200 rounded-lg pl-8 pr-2 py-1.5 text-sm"
              />
            </div>
          </label>
          <button
            type="button"
            onClick={load}
            className="px-3 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium"
          >
            Filtrar
          </button>
          <button
            type="button"
            disabled={exporting}
            onClick={exportCsv}
            className="px-3 py-2 rounded-lg border border-slate-200 text-sm font-medium inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            {exporting ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
            CSV
          </button>
        </div>
        <p className="text-xs text-slate-500">
          Unifica atendimentos da fila (JIT) e consultas voluntárias agendadas. {items.length}{" "}
          registro(s).
        </p>
      </div>

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-x-auto">
        {loading ? (
          <div className="p-8 flex justify-center">
            <Loader2 className="animate-spin text-emerald-500" />
          </div>
        ) : items.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-400">Nenhum agendamento no período</p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-500 border-b bg-slate-50">
                <th className="px-4 py-2.5">Quando</th>
                <th className="px-4 py-2.5">Tipo</th>
                <th className="px-4 py-2.5">Paciente</th>
                <th className="px-4 py-2.5">Profissional</th>
                <th className="px-4 py-2.5">Especialidade</th>
                <th className="px-4 py-2.5">Status</th>
                <th className="px-4 py-2.5">Duração</th>
              </tr>
            </thead>
            <tbody>
              {items.map((i) => (
                <tr key={`${i.kind}-${i.id}`} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-2.5 whitespace-nowrap">
                    {new Date(i.scheduledAt).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </td>
                  <td className="px-4 py-2.5">
                    <span
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                        i.kind === "queue"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-violet-100 text-violet-800"
                      }`}
                    >
                      {i.kind === "queue" ? "FILA" : "AGENDADO"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 font-medium">
                    {i.patientProfileId ? (
                      <Link
                        href={`/admin/patients/${i.patientProfileId}`}
                        className="text-emerald-700 hover:underline"
                      >
                        {i.patientName}
                      </Link>
                    ) : (
                      i.patientName
                    )}
                  </td>
                  <td className="px-4 py-2.5">{i.professionalName ?? "—"}</td>
                  <td className="px-4 py-2.5">{i.specialty ?? i.poolLabel ?? "—"}</td>
                  <td className="px-4 py-2.5">
                    <span className="text-xs font-medium">{i.status}</span>
                    {i.priority && (
                      <span className="ml-1 text-[10px] text-slate-400">{i.priority}</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5">
                    {i.durationMinutes != null ? `${i.durationMinutes} min` : "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
