"use client";

import { useCallback, useEffect, useState } from "react";
import { ScrollText, Loader2, RefreshCw, Filter } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

interface AuditRow {
  id: string;
  action: string;
  resource: string;
  resourceId: string | null;
  userEmail: string | null;
  userRole: string | null;
  createdAt: string;
}

export default function AdminAuditClient() {
  const { t } = useI18n();
  const [logs, setLogs] = useState<AuditRow[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [action, setAction] = useState("");
  const [resource, setResource] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const qs = new URLSearchParams({ page: String(page) });
      if (action) qs.set("action", action);
      if (resource) qs.set("resource", resource);
      const res = await fetch(`/api/admin/audit?${qs}`);
      if (!res.ok) { setError(true); return; }
      const data = await res.json();
      setLogs(data.logs || []);
      setTotalPages(data.totalPages || 1);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [page, action, resource]);

  useEffect(() => { load(); }, [load]);

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-10">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
            <ScrollText size={24} className="text-brand-500" /> {t("admin.audit.title")}
          </h1>
          <p className="text-slate-500 text-sm mt-1">{t("admin.audit.subtitle")}</p>
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="inline-flex items-center gap-2 text-sm font-semibold text-brand-600 border border-brand-200 bg-brand-50 px-3 py-2 rounded-xl hover:bg-brand-100 disabled:opacity-50"
        >
          <RefreshCw size={14} className={loading ? "animate-spin" : ""} /> {t("common.retry")}
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide flex items-center gap-1">
            <Filter size={12} /> {t("admin.audit.filterAction")}
          </label>
          <select
            value={action}
            onChange={(e) => { setAction(e.target.value); setPage(1); }}
            className="mt-1 block w-full min-w-[160px] text-sm border border-slate-200 rounded-lg px-3 py-2"
          >
            <option value="">{t("admin.audit.allActions")}</option>
            {["LOGIN", "LOGOUT", "VIEW_RECORD", "CREATE_RECORD", "UPDATE_RECORD", "DELETE_RECORD", "EXPORT_DATA", "SHARE_RECORD", "PAYMENT"].map((a) => (
              <option key={a} value={a}>{a}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="text-xs font-semibold text-slate-500 uppercase tracking-wide">{t("admin.audit.filterResource")}</label>
          <input
            value={resource}
            onChange={(e) => { setResource(e.target.value); setPage(1); }}
            placeholder="MedicalDocument"
            className="mt-1 block w-full text-sm border border-slate-200 rounded-lg px-3 py-2"
          />
        </div>
      </div>

      {error ? (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 text-sm px-4 py-3 rounded-xl">
          {t("common.loadError")}
        </div>
      ) : loading ? (
        <div className="flex justify-center py-16"><Loader2 size={28} className="animate-spin text-slate-400" /></div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-50 text-left text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">{t("admin.audit.colWhen")}</th>
                <th className="px-4 py-3">{t("admin.audit.colAction")}</th>
                <th className="px-4 py-3">{t("admin.audit.colResource")}</th>
                <th className="px-4 py-3 hidden sm:table-cell">{t("admin.audit.colUser")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-slate-400">{t("admin.audit.empty")}</td>
                </tr>
              ) : logs.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/80">
                  <td className="px-4 py-3 text-slate-600 whitespace-nowrap">
                    {new Date(row.createdAt).toLocaleString()}
                  </td>
                  <td className="px-4 py-3">
                    <span className="font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">{row.action}</span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {row.resource}
                    {row.resourceId && (
                      <span className="block text-xs text-slate-400 truncate max-w-[200px]">{row.resourceId}</span>
                    )}
                  </td>
                  <td className="px-4 py-3 hidden sm:table-cell text-slate-600">
                    {row.userEmail || "?"}
                    {row.userRole && <span className="block text-xs text-slate-400">{row.userRole}</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-3">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => p - 1)}
            className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
          >
            ?
          </button>
          <span className="text-sm text-slate-500">{page} / {totalPages}</span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="text-sm px-3 py-1.5 rounded-lg border border-slate-200 disabled:opacity-40"
          >
            ?
          </button>
        </div>
      )}
    </div>
  );
}
