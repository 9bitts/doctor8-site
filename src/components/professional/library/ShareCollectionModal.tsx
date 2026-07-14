"use client";

import { useEffect, useState } from "react";
import { X, Search, Share2, CheckCircle2, AlertCircle, Loader2 } from "lucide-react";
import { useI18n } from "@/lib/i18n/I18nProvider";
import NoPatientChartsEmptyState from "@/components/professional/NoPatientChartsEmptyState";

interface ShareCollectionModalProps {
  apiBase: string;
  collectionId: string;
  collectionTitle: string;
  onClose: () => void;
  onShared: () => void;
}

interface ChartRow {
  id: string;
  firstName: string;
  lastName: string;
}

export default function ShareCollectionModal({
  apiBase,
  collectionId,
  collectionTitle,
  onClose,
  onShared,
}: ShareCollectionModalProps) {
  const { t } = useI18n();
  const [charts, setCharts] = useState<ChartRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sharingId, setSharingId] = useState<string | null>(null);
  const [status, setStatus] = useState<Record<string, "ok" | "error">>({});

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/professional/records");
        const data = await res.json();
        setCharts(data.records || []);
      } catch { /* ignore */ }
      setLoading(false);
    })();
  }, []);

  async function shareWith(chartId: string) {
    setSharingId(chartId);
    try {
      const res = await fetch(`${apiBase}/library/collections/${collectionId}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patientRecordId: chartId }),
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
  }

  const filtered = charts.filter((c) =>
    `${c.firstName} ${c.lastName}`.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="fixed inset-0 bg-black/40 flex items-end sm:items-center justify-center z-[100] p-4">
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md max-h-[85vh] flex flex-col">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <div>
            <h2 className="font-bold text-slate-800">{t("libHub.shareCollection")}</h2>
            <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{collectionTitle}</p>
          </div>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
        </div>
        <div className="p-4 flex-1 overflow-y-auto">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t("libHub.search")}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-sm outline-none focus:border-brand-400"
            />
          </div>
          {loading ? (
            <div className="flex justify-center py-8"><Loader2 size={20} className="animate-spin text-slate-400" /></div>
          ) : filtered.length === 0 ? (
            <NoPatientChartsEmptyState />
          ) : (
            <ul className="space-y-2">
              {filtered.map((c) => {
                const name = `${c.firstName} ${c.lastName}`.trim();
                return (
                  <li key={c.id} className="flex items-center justify-between gap-2 p-3 rounded-xl border border-slate-100">
                    <span className="text-sm font-medium text-slate-800 truncate">{name}</span>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {status[c.id] === "ok" && <CheckCircle2 size={16} className="text-emerald-500" />}
                      {status[c.id] === "error" && <AlertCircle size={16} className="text-rose-500" />}
                      <button
                        type="button"
                        disabled={sharingId === c.id}
                        onClick={() => shareWith(c.id)}
                        className="inline-flex items-center gap-1 text-xs font-semibold text-white bg-brand-500 hover:bg-brand-600 disabled:opacity-50 px-3 py-1.5 rounded-lg"
                      >
                        {sharingId === c.id ? <Loader2 size={12} className="animate-spin" /> : <Share2 size={12} />}
                        {t("libHub.sharePrimary")}
                      </button>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
