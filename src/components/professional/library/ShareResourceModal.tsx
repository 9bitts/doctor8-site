"use client";

import { useEffect, useState } from "react";
import {
  X, Search, Share2, CheckCircle2, AlertCircle, Loader2, MessageCircle,
} from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import { openWhatsAppShareLink } from "@/components/professional/emissions/whatsapp-share-link";
import NoPatientChartsEmptyState from "@/components/professional/NoPatientChartsEmptyState";
import type { LibraryResourceDto } from "@/lib/professional-library/types";

interface ShareResourceModalProps {
  apiBase: string;
  resource: LibraryResourceDto;
  recipientMode: "patient" | "analysand" | "integrative_client";
  /** Pre-select chart when opened from prontuário */
  preselectedChartId?: string;
  preselectedName?: string;
  onClose: () => void;
  onShared: () => void;
}

interface ChartRow {
  id: string;
  firstName: string;
  lastName: string;
}

export default function ShareResourceModal({
  apiBase,
  resource,
  recipientMode,
  preselectedChartId,
  preselectedName,
  onClose,
  onShared,
}: ShareResourceModalProps) {
  const { lang, t } = useI18n();
  const [charts, setCharts] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, "ok" | "error">>({});

  const recordsEndpoint = recipientMode === "analysand"
    ? "/api/psychoanalyst/analysands"
    : recipientMode === "integrative_client"
      ? "/api/integrative-therapist/clients"
      : "/api/professional/records";

  const shareEndpoint = (resourceId: string) => {
    if (recipientMode === "analysand") return `/api/psychoanalyst/resources/${resourceId}/share`;
    if (recipientMode === "integrative_client") return `${apiBase}/resources/${resourceId}/share`;
    return `${apiBase}/resources/${resourceId}/share`;
  };

  const shareBodyKey = recipientMode === "analysand"
    ? "analysandRecordId"
    : recipientMode === "integrative_client"
      ? "integrativeClientRecordId"
      : "patientRecordId";

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(recordsEndpoint);
        const data = await res.json();
        const list = data.records || data.analysands || data.clients || [];
        setCharts(list);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, [recordsEndpoint]);

  async function shareWith(chartId: string, patientName: string) {
    setSharingId(chartId);
    try {
      const res = await fetch(shareEndpoint(resource.id), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [shareBodyKey]: chartId }),
      });
      if (res.ok) {
        setStatus((s) => ({ ...s, [chartId]: "ok" }));
        onShared();
      } else {
        setStatus((s) => ({ ...s, [chartId]: "error" }));
      }
    } catch {
      setStatus((s) => ({ ...s, [chartId]: "error" }));
    }
    setSharingId(null);

    if (patientName) {
      openWhatsAppShareLink({
        patientName,
        shareUrl: `${window.location.origin}/patient/resources`,
        messageTemplate: t("libHub.whatsappTemplate"),
      });
    }
  }

  const filtered = charts.filter((c) =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800">{t("libHub.sharePrimary")}</h2>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{resource.title}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>

        <div className="p-4 flex-1 overflow-y-auto">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={recipientMode === "analysand" ? t("lib.shareSearchAnalyst") : t("lib.shareSearch")}
              className="w-full pl-8 pr-3 py-2 text-sm rounded-xl border border-slate-200 outline-none focus:border-brand-400"
            />
          </div>

          {loading ? (
            <div className="flex items-center gap-2 text-slate-400 text-sm py-4 justify-center">
              <Loader2 size={16} className="animate-spin" /> {t("lib.shareLoading")}
            </div>
          ) : charts.length === 0 ? (
            <NoPatientChartsEmptyState variant="brand" compact />
          ) : filtered.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-4">{t("pat.searchEmpty")}</p>
          ) : (
            <div className="space-y-1">
              {filtered.map((c) => {
                const name = `${c.firstName} ${c.lastName}`.trim();
                const st = status[c.id];
                return (
                  <div key={c.id} className="flex items-center justify-between py-2 px-2 rounded-lg hover:bg-slate-50 gap-2">
                    <span className="text-sm text-slate-700 truncate">{name}</span>
                    <div className="flex items-center gap-1 shrink-0">
                      {st === "ok" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-brand-500">
                          <CheckCircle2 size={13} /> {t("lib.shared")}
                        </span>
                      ) : st === "error" ? (
                        <span className="inline-flex items-center gap-1 text-xs text-rose-500">
                          <AlertCircle size={13} /> Erro
                        </span>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => shareWith(c.id, "")}
                            disabled={sharingId === c.id}
                            className="inline-flex items-center gap-1 text-xs font-medium text-white bg-brand-500 px-2.5 py-1 rounded-lg disabled:opacity-50"
                          >
                            {sharingId === c.id ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
                            App
                          </button>
                          <button
                            type="button"
                            onClick={() => shareWith(c.id, name)}
                            disabled={sharingId === c.id}
                            className="inline-flex items-center gap-1 text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg"
                            title={t("libHub.whatsappShare")}
                          >
                            <MessageCircle size={12} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
