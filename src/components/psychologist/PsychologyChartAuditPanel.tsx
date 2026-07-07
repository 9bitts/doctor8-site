"use client";

import { useEffect, useState } from "react";
import { Shield, Loader2, ChevronDown, ChevronUp } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";

type AuditRow = {
  id: string;
  action: string;
  resource: string;
  userEmail: string | null;
  createdAt: string;
  isSelf: boolean;
};

const ACTION_KEYS: Record<string, string> = {
  VIEW_RECORD: "psy.audit.action.view",
  CREATE_RECORD: "psy.audit.action.create",
  UPDATE_RECORD: "psy.audit.action.update",
  DELETE_RECORD: "psy.audit.action.delete",
  EXPORT_DATA: "psy.audit.action.export",
  SHARE_RECORD: "psy.audit.action.share",
};

export default function PsychologyChartAuditPanel({ chartId }: { chartId: string }) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState<AuditRow[]>([]);

  useEffect(() => {
    if (!open) return;
    let active = true;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(`/api/professional/records/${chartId}/audit-trail`);
        const data = await res.json();
        if (active) setLogs(data.logs || []);
      } catch { /* ignore */ }
      if (active) setLoading(false);
    })();
    return () => { active = false; };
  }, [open, chartId]);

  function formatDate(iso: string) {
    const locale = lang === "pt" ? "pt-BR" : lang === "es" ? "es" : "en";
    return new Date(iso).toLocaleString(locale);
  }

  function actionLabel(action: string) {
    const key = ACTION_KEYS[action];
    return key ? t(key) : action;
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50/50">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <span className="inline-flex items-center gap-2 text-sm font-semibold text-slate-800">
          <Shield size={16} className="text-violet-600" />
          {t("psy.audit.title")}
        </span>
        {open ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
      </button>
      {open && (
        <div className="border-t border-slate-200 px-4 py-3">
          <p className="text-xs text-slate-500 mb-3">{t("psy.audit.desc")}</p>
          {loading ? (
            <div className="flex justify-center py-6"><Loader2 className="animate-spin text-violet-500" size={20} /></div>
          ) : logs.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">{t("psy.audit.empty")}</p>
          ) : (
            <ul className="space-y-2 max-h-64 overflow-y-auto">
              {logs.map((log) => (
                <li key={log.id} className="text-xs bg-white rounded-lg border border-slate-100 px-3 py-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-slate-800">{actionLabel(log.action)}</span>
                    <span className="text-slate-400 shrink-0">{formatDate(log.createdAt)}</span>
                  </div>
                  <p className="text-slate-500 mt-0.5 truncate">
                    {log.isSelf ? t("psy.audit.you") : log.userEmail || t("psy.audit.system")}
                    {log.resource !== "PatientRecord" && ` · ${log.resource}`}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
