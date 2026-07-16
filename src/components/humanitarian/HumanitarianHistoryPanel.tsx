"use client";

import { useCallback, useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import type {
  HumanitarianAuditRowDto,
  HumanitarianHistoryDto,
} from "@/lib/humanitarian/admin-history";
import { VENEZUELA_CAMPAIGN_SLUG } from "@/lib/humanitarian/constants";

export default function HumanitarianHistoryPanel({
  slug = VENEZUELA_CAMPAIGN_SLUG,
}: {
  slug?: string;
}) {
  const [days, setDays] = useState(7);
  const [history, setHistory] = useState<HumanitarianHistoryDto | null>(null);
  const [audit, setAudit] = useState<HumanitarianAuditRowDto[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/admin/humanitarian/history?slug=${encodeURIComponent(slug)}&days=${days}`,
      );
      const data = await res.json();
      if (res.ok) {
        setHistory(data.history);
        setAudit(data.audit || []);
      }
    } catch {
      /* ignore */
    }
    setLoading(false);
  }, [slug, days]);

  useEffect(() => {
    load();
  }, [load]);

  const maxDay = history
    ? Math.max(1, ...history.days.map((d) => d.completed + d.entered))
    : 1;
  const maxHour = history
    ? Math.max(1, ...history.hoursToday.map((h) => h.completed + h.entered))
    : 1;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 flex-wrap">
        <label className="text-sm text-slate-600 flex items-center gap-2">
          Período
          <select
            value={days}
            onChange={(e) => setDays(Number(e.target.value))}
            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm"
          >
            <option value={7}>7 dias</option>
            <option value={14}>14 dias</option>
            <option value={30}>30 dias</option>
          </select>
        </label>
        <button
          type="button"
          onClick={load}
          className="text-sm px-3 py-1.5 rounded-lg border border-slate-200"
        >
          Atualizar
        </button>
      </div>

      {loading && !history ? (
        <Loader2 className="animate-spin text-emerald-500" />
      ) : history ? (
        <>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: "Entraram", value: history.totals.entered },
              { label: "Concluídos", value: history.totals.completed },
              { label: "No-show", value: history.totals.noShow },
              { label: "Cancelados", value: history.totals.cancelled },
            ].map((s) => (
              <div key={s.label} className="bg-white border border-slate-100 rounded-xl p-3 shadow-sm">
                <p className="text-xs text-slate-500">{s.label}</p>
                <p className="text-xl font-bold text-slate-900">{s.value}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Volume por dia</h3>
            <div className="flex items-end gap-1.5 h-32 overflow-x-auto">
              {history.days.map((d) => {
                const h = ((d.completed + d.entered) / maxDay) * 100;
                return (
                  <div key={d.date} className="flex flex-col items-center gap-1 min-w-[28px] flex-1">
                    <div
                      className="w-full bg-emerald-400/80 rounded-t"
                      style={{ height: `${Math.max(4, h)}%` }}
                      title={`${d.date}: ${d.entered} entraram, ${d.completed} feitos`}
                    />
                    <span className="text-[9px] text-slate-400 rotate-0">
                      {d.date.slice(5)}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="text-xs text-slate-500">Altura = entradas + concluídos no dia</p>
          </div>

          <div className="bg-white border border-slate-100 rounded-2xl p-4 shadow-sm space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">Hoje por hora</h3>
            <div className="flex items-end gap-0.5 h-28">
              {history.hoursToday.map((h) => {
                const pct = ((h.completed + h.entered) / maxHour) * 100;
                return (
                  <div key={h.hour} className="flex-1 flex flex-col items-center gap-0.5">
                    <div
                      className="w-full bg-blue-400/70 rounded-t"
                      style={{ height: `${Math.max(h.entered || h.completed ? 4 : 1, pct)}%` }}
                      title={`${h.hour}h: ${h.entered} entraram, ${h.completed} feitos`}
                    />
                    {h.hour % 3 === 0 && (
                      <span className="text-[9px] text-slate-400">{h.hour}</span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      ) : (
        <p className="text-sm text-slate-500">Sem dados de histórico</p>
      )}

      <div className="bg-white border border-slate-100 rounded-2xl shadow-sm overflow-hidden">
        <div className="px-4 py-3 border-b border-slate-100">
          <h3 className="text-sm font-semibold text-slate-900">
            Auditoria de intervenções admin
          </h3>
          <p className="text-xs text-slate-500">
            Remoções, reposicionamentos, problemas e liberações
          </p>
        </div>
        {audit.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 text-center">Nenhuma ação registrada ainda</p>
        ) : (
          <ul className="divide-y divide-slate-50 max-h-[360px] overflow-y-auto">
            {audit.map((a) => (
              <li key={a.id} className="px-4 py-2.5 text-sm">
                <div className="flex justify-between gap-2 flex-wrap">
                  <span className="font-medium text-slate-800">
                    {a.adminAction ?? a.action}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(a.createdAt).toLocaleString("pt-BR")}
                  </span>
                </div>
                <p className="text-xs text-slate-500">
                  {a.userEmail ?? "admin"} · {a.resource}
                  {a.resourceId ? ` · ${a.resourceId.slice(0, 8)}…` : ""}
                </p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
